import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { getServerTranslator } from '@/i18n/locale-server'
import { NotificationSettings } from './notification-settings'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsSettingsPage() {
  const user = (await getCurrentUser())!
  const { t } = await getServerTranslator()
  const prefs = user.preferences

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          aria-label={t('transactions.backAria')}
          className="flex size-11 items-center justify-center rounded-full bg-surface-sunken"
        >
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <h1 className="text-title-screen">{t('profile.notifications')}</h1>
      </div>
      <NotificationSettings
        notifyDailyReminder={prefs?.notifyDailyReminder ?? true}
        notifyBudgetAlerts={prefs?.notifyBudgetAlerts ?? true}
        notifyWeeklySummary={prefs?.notifyWeeklySummary ?? false}
      />
    </div>
  )
}
