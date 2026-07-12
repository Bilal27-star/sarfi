import { db } from '@/server/db'
import { addDays, endOfDay, startOfDay } from '@/lib/dates'
import type { NotificationType, Prisma } from '@/generated/prisma/client'

/** A user-preference flag that must be `true` for a draft to survive. */
type NotifyPref = 'notifyDailyReminder' | 'notifyBudgetAlerts' | 'notifyWeeklySummary'

export type DraftNotification = {
  userId: string
  type: NotificationType
  params: Record<string, string>
  link?: string
  /** Stable per-occurrence key — see the Notification model's @@unique for why. */
  dedupeKey: string
  requiredPref: NotifyPref
}

export type NotificationProducer = (now: Date) => Promise<DraftNotification[]>

/**
 * One reminder per active RecurringExpense due within the next day. This is
 * the only producer wired up in this milestone — budget alerts and monthly
 * summaries are future producers appended to PRODUCERS below; nothing else
 * in the engine needs to change to add them.
 */
export const recurringReminderProducer: NotificationProducer = async (now) => {
  const windowEnd = endOfDay(addDays(now, 1))
  const due = await db.recurringExpense.findMany({
    where: { isActive: true, nextDueDate: { gte: startOfDay(now), lte: windowEnd } },
    select: { id: true, userId: true, description: true, amount: true, currency: true, nextDueDate: true },
  })

  return due.map((r) => ({
    userId: r.userId,
    type: 'RECURRING_REMINDER',
    params: { description: r.description, amount: r.amount.toString(), currency: r.currency },
    link: '/profile/recurring',
    dedupeKey: `recurring:${r.id}:${r.nextDueDate.toISOString()}`,
    requiredPref: 'notifyDailyReminder',
  }))
}

/** Registry — append future producers (budget alerts, monthly summaries) here. */
const PRODUCERS: NotificationProducer[] = [recurringReminderProducer]

export type GenerateSummary = { usersProcessed: number; notificationsCreated: number }

/**
 * Runs every registered producer, drops drafts whose owning user has the
 * corresponding preference off, then persists the rest. Safe to invoke
 * concurrently or repeatedly: `dedupeKey` is unique per (user, occurrence),
 * so a re-run's createMany simply skips rows that already exist — the same
 * idempotency guarantee recurring-materialize.ts gets from its
 * compare-and-swap, achieved here via a DB constraint instead of a loop.
 */
export async function generateDueNotifications(now: Date = new Date()): Promise<GenerateSummary> {
  const drafts = (await Promise.all(PRODUCERS.map((produce) => produce(now)))).flat()
  if (drafts.length === 0) return { usersProcessed: 0, notificationsCreated: 0 }

  const userIds = [...new Set(drafts.map((d) => d.userId))]
  const prefs = await db.userPreferences.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, notifyDailyReminder: true, notifyBudgetAlerts: true, notifyWeeklySummary: true },
  })
  const prefsByUser = new Map(prefs.map((p) => [p.userId, p]))

  // No UserPreferences row yet (e.g. mid-setup) falls back to the schema
  // defaults, which are all "on" except the weekly summary — see
  // prisma/schema.prisma UserPreferences.
  const DEFAULT_PREFS: Record<NotifyPref, boolean> = {
    notifyDailyReminder: true,
    notifyBudgetAlerts: true,
    notifyWeeklySummary: false,
  }

  const allowed = drafts.filter((d) => {
    const userPrefs = prefsByUser.get(d.userId)
    return userPrefs ? userPrefs[d.requiredPref] : DEFAULT_PREFS[d.requiredPref]
  })
  if (allowed.length === 0) return { usersProcessed: userIds.length, notificationsCreated: 0 }

  const data: Prisma.NotificationCreateManyInput[] = allowed.map((d) => ({
    userId: d.userId,
    type: d.type,
    params: d.params,
    link: d.link,
    dedupeKey: d.dedupeKey,
  }))

  const created = await db.notification.createMany({ data, skipDuplicates: true })
  return { usersProcessed: userIds.length, notificationsCreated: created.count }
}
