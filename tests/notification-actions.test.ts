// Notification mutations: ownership on the mark-read path (never trust an id
// alone — ownership is always re-checked against the session user, same as
// recurring/category/wallet actions), and the preferences upsert.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireUserMock = vi.fn()
vi.mock('@/server/auth/session', () => ({ requireUser: (...args: unknown[]) => requireUserMock(...args) }))

const findFirstMock = vi.fn()
const updateMock = vi.fn().mockResolvedValue({})
const updateManyMock = vi.fn().mockResolvedValue({ count: 0 })
const upsertMock = vi.fn().mockResolvedValue({})
vi.mock('@/server/db', () => ({
  db: {
    notification: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
    userPreferences: { upsert: (...args: unknown[]) => upsertMock(...args) },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/services/notifications', () => ({ getNotifications: vi.fn() }))

import { markNotificationRead, markAllNotificationsRead, updateNotificationPreferences } from '@/server/services/notification-actions'

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ id: 'user-1' })
  findFirstMock.mockReset()
  updateMock.mockClear()
  updateManyMock.mockClear().mockResolvedValue({ count: 0 })
  upsertMock.mockClear()
})

describe('markNotificationRead', () => {
  it('returns notification_forbidden for a notification that does not belong to the caller', async () => {
    findFirstMock.mockResolvedValue(null)
    const result = await markNotificationRead('someone-elses-notif')
    expect(result).toEqual({ ok: false, errorCode: 'notification_forbidden' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('scopes the ownership lookup to the caller before updating', async () => {
    findFirstMock.mockResolvedValue({ id: 'notif-1' })
    const result = await markNotificationRead('notif-1')
    expect(result).toEqual({ ok: true })
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 'notif-1', userId: 'user-1' }, select: { id: true } })
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'notif-1' }, data: { readAt: expect.any(Date) } })
  })
})

describe('markAllNotificationsRead', () => {
  it('only clears the caller’s own unread notifications', async () => {
    const result = await markAllNotificationsRead()
    expect(result).toEqual({ ok: true })
    expect(updateManyMock).toHaveBeenCalledWith({ where: { userId: 'user-1', readAt: null }, data: { readAt: expect.any(Date) } })
  })
})

describe('updateNotificationPreferences', () => {
  it('rejects non-boolean input without touching the DB', async () => {
    const result = await updateNotificationPreferences({ notifyDailyReminder: 'yes' })
    expect(result).toEqual({ ok: false, errorCode: 'invalid_input' })
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('upserts only the provided flag, scoped to the caller', async () => {
    const result = await updateNotificationPreferences({ notifyBudgetAlerts: false })
    expect(result).toEqual({ ok: true })
    expect(upsertMock).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { notifyDailyReminder: undefined, notifyBudgetAlerts: false, notifyWeeklySummary: undefined },
      create: { userId: 'user-1', notifyDailyReminder: undefined, notifyBudgetAlerts: false, notifyWeeklySummary: undefined },
    })
  })

  it('is a no-op when no fields are provided', async () => {
    const result = await updateNotificationPreferences({})
    expect(result).toEqual({ ok: true })
    expect(upsertMock).not.toHaveBeenCalled()
  })
})
