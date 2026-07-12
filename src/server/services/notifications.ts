import { db } from '@/server/db'
import type { NotificationType } from '@/generated/prisma/client'

export type NotificationDTO = {
  id: string
  type: NotificationType
  params: Record<string, string>
  link: string | null
  read: boolean
  createdAt: string
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } })
}

export async function getNotifications(userId: string, limit = 30): Promise<NotificationDTO[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    params: (r.params as Record<string, string> | null) ?? {},
    link: r.link,
    read: r.readAt !== null,
    createdAt: r.createdAt.toISOString(),
  }))
}
