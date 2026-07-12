// Notification generator: producer window/shape, preference gating (with a
// sensible default when a user has no UserPreferences row yet), and the
// createMany + skipDuplicates idempotency contract that makes a daily-cron
// re-run safe — mirrors the compare-and-swap guarantee in
// recurring-materialize.ts, just enforced by a DB unique constraint instead.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, endOfDay, startOfDay } from '@/lib/dates'

const recurringFindManyMock = vi.fn()
const prefsFindManyMock = vi.fn()
const notificationCreateManyMock = vi.fn()
vi.mock('@/server/db', () => ({
  db: {
    recurringExpense: { findMany: (...args: unknown[]) => recurringFindManyMock(...args) },
    userPreferences: { findMany: (...args: unknown[]) => prefsFindManyMock(...args) },
    notification: { createMany: (...args: unknown[]) => notificationCreateManyMock(...args) },
  },
}))

import { generateDueNotifications, recurringReminderProducer } from '@/server/services/notification-engine'

const now = new Date('2026-07-12T09:00:00.000Z')

function dueRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rec-1',
    userId: 'user-1',
    description: 'Gym Membership',
    amount: { toString: () => '3500' },
    currency: 'DZD',
    nextDueDate: new Date('2026-07-12T12:00:00.000Z'),
    ...overrides,
  }
}

describe('recurringReminderProducer', () => {
  beforeEach(() => recurringFindManyMock.mockReset())

  it('queries active templates due within the next day and shapes one draft per row', async () => {
    recurringFindManyMock.mockResolvedValue([dueRow()])
    const drafts = await recurringReminderProducer(now)
    expect(drafts).toEqual([
      {
        userId: 'user-1',
        type: 'RECURRING_REMINDER',
        params: { description: 'Gym Membership', amount: '3500', currency: 'DZD' },
        link: '/profile/recurring',
        dedupeKey: 'recurring:rec-1:2026-07-12T12:00:00.000Z',
        requiredPref: 'notifyDailyReminder',
      },
    ])
    const where = recurringFindManyMock.mock.calls[0][0].where
    expect(where.isActive).toBe(true)
    // Window boundaries are server-local (see dates.ts) — derive the
    // expectation from the same helpers rather than assuming UTC.
    expect(where.nextDueDate.gte).toEqual(startOfDay(now))
    expect(where.nextDueDate.lte).toEqual(endOfDay(addDays(now, 1)))
  })
})

describe('generateDueNotifications', () => {
  beforeEach(() => {
    recurringFindManyMock.mockReset()
    prefsFindManyMock.mockReset().mockResolvedValue([])
    notificationCreateManyMock.mockReset().mockResolvedValue({ count: 0 })
  })

  it('short-circuits with no DB writes when nothing is due', async () => {
    recurringFindManyMock.mockResolvedValue([])
    const summary = await generateDueNotifications(now)
    expect(summary).toEqual({ usersProcessed: 0, notificationsCreated: 0 })
    expect(prefsFindManyMock).not.toHaveBeenCalled()
    expect(notificationCreateManyMock).not.toHaveBeenCalled()
  })

  it('drops a draft when the owning user has the required preference off', async () => {
    recurringFindManyMock.mockResolvedValue([dueRow({ userId: 'muted-user' })])
    prefsFindManyMock.mockResolvedValue([{ userId: 'muted-user', notifyDailyReminder: false, notifyBudgetAlerts: true, notifyWeeklySummary: false }])
    const summary = await generateDueNotifications(now)
    expect(summary).toEqual({ usersProcessed: 1, notificationsCreated: 0 })
    expect(notificationCreateManyMock).not.toHaveBeenCalled()
  })

  it('falls back to the schema default (on) when the user has no UserPreferences row yet', async () => {
    recurringFindManyMock.mockResolvedValue([dueRow({ userId: 'brand-new-user' })])
    prefsFindManyMock.mockResolvedValue([]) // no row for this user
    notificationCreateManyMock.mockResolvedValue({ count: 1 })
    const summary = await generateDueNotifications(now)
    expect(summary.notificationsCreated).toBe(1)
    expect(notificationCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          userId: 'brand-new-user',
          type: 'RECURRING_REMINDER',
          params: { description: 'Gym Membership', amount: '3500', currency: 'DZD' },
          link: '/profile/recurring',
          dedupeKey: 'recurring:rec-1:2026-07-12T12:00:00.000Z',
        },
      ],
      skipDuplicates: true,
    })
  })

  it('is idempotent across re-runs via skipDuplicates — a re-run reports zero new rows for an already-seen dedupeKey', async () => {
    recurringFindManyMock.mockResolvedValue([dueRow()])
    prefsFindManyMock.mockResolvedValue([{ userId: 'user-1', notifyDailyReminder: true, notifyBudgetAlerts: true, notifyWeeklySummary: false }])
    notificationCreateManyMock.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })

    const first = await generateDueNotifications(now)
    const second = await generateDueNotifications(now)

    expect(first.notificationsCreated).toBe(1)
    expect(second.notificationsCreated).toBe(0)
    expect(notificationCreateManyMock).toHaveBeenCalledTimes(2)
    for (const call of notificationCreateManyMock.mock.calls) {
      expect(call[0].skipDuplicates).toBe(true)
    }
  })
})
