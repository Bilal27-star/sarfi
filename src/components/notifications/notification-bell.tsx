'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, CalendarClock, AlertTriangle, ChartPie } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { useT, useLocale } from '@/i18n/provider'
import type { Translator } from '@/i18n/translator'
import { dayLabel } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import type { NotificationDTO } from '@/server/services/notifications'
import { getMyNotifications, markAllNotificationsRead } from '@/server/services/notification-actions'

const TYPE_ICON = {
  RECURRING_REMINDER: CalendarClock,
  BUDGET_ALERT: AlertTriangle,
  MONTHLY_SUMMARY: ChartPie,
} as const

/** Bell + unread badge, mounted once on desktop (sidebar) and once on
 * mobile (Home hero). Opening it lazy-loads the feed and marks everything
 * read — this milestone has no per-item read state, only a center. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnread)
  const [items, setItems] = useState<NotificationDTO[] | null>(null)
  const [, startTransition] = useTransition()

  function handleOpen() {
    feedback.tap()
    setOpen(true)

    if (items === null) {
      startTransition(async () => {
        setItems(await getMyNotifications())
      })
    }

    if (unread > 0) {
      setUnread(0)
      startTransition(async () => {
        const result = await markAllNotificationsRead()
        if (!result.ok) {
          feedback.error()
          router.refresh()
        }
      })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('notifications.centerAria')}
        className="relative flex size-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="tnum absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('notifications.title')}>
        {items === null ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-surface-sunken" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{t('notifications.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} locale={locale} t={t} />
            ))}
          </ul>
        )}
      </Sheet>
    </>
  )
}

function NotificationRow({ item, locale, t }: { item: NotificationDTO; locale: string; t: Translator }) {
  const Icon = TYPE_ICON[item.type]
  const title = t(`notifications.types.${item.type}.title`)
  const amount = item.params.amount ? formatMoney(item.params.amount, { currency: item.params.currency, locale }) : ''
  const body = t(`notifications.types.${item.type}.body`, { description: item.params.description ?? '', amount })

  const content = (
    <div className={cn('flex items-start gap-3 rounded-md border border-border-subtle bg-surface p-3', item.read && 'opacity-60')}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-success">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-title-card">{title}</span>
        <span className="block truncate text-meta">{body}</span>
        <span className="block text-caption text-text-muted">{dayLabel(new Date(item.createdAt), locale, t)}</span>
      </span>
    </div>
  )

  if (item.link) {
    return (
      <li>
        <Link href={item.link} className="block rounded-md transition-colors hover:bg-surface-sunken">
          {content}
        </Link>
      </li>
    )
  }
  return <li>{content}</li>
}
