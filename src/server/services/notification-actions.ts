'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { getNotifications, type NotificationDTO } from '@/server/services/notifications'
import type { ActionResult } from '@/server/services/expense-actions'

async function assertOwnNotification(userId: string, id: string) {
  const notification = await db.notification.findFirst({ where: { id, userId }, select: { id: true } })
  if (!notification) throw new Error('FORBIDDEN')
}

export async function getMyNotifications(): Promise<NotificationDTO[]> {
  const user = await requireUser()
  return getNotifications(user.id)
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await assertOwnNotification(user.id, id)
    await db.notification.update({ where: { id }, data: { readAt: new Date() } })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'notification_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'update_failed' }
  }
}

const notificationPreferencesSchema = z.object({
  notifyDailyReminder: z.boolean().optional(),
  notifyBudgetAlerts: z.boolean().optional(),
  notifyWeeklySummary: z.boolean().optional(),
})

export async function updateNotificationPreferences(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = notificationPreferencesSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { notifyDailyReminder, notifyBudgetAlerts, notifyWeeklySummary } = parsed.data
    if (
      notifyDailyReminder === undefined &&
      notifyBudgetAlerts === undefined &&
      notifyWeeklySummary === undefined
    ) {
      return { ok: true }
    }

    const patch = { notifyDailyReminder, notifyBudgetAlerts, notifyWeeklySummary }
    await db.userPreferences.upsert({
      where: { userId: user.id },
      update: patch,
      create: { userId: user.id, ...patch },
    })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}
