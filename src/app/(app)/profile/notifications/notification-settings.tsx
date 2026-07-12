'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsSection, SettingsToggleRow } from '../profile-settings'
import { updateNotificationPreferences } from '@/server/services/notification-actions'
import { resolveActionError } from '@/i18n/action-error'
import { feedback } from '@/lib/feedback'
import { useT } from '@/i18n/provider'

type Prefs = {
  notifyDailyReminder: boolean
  notifyBudgetAlerts: boolean
  notifyWeeklySummary: boolean
}

export function NotificationSettings(initial: Prefs) {
  const t = useT()
  const router = useRouter()
  const [values, setValues] = useState<Prefs>(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggle(key: keyof Prefs, next: boolean) {
    feedback.tap()
    setError(null)
    setValues((v) => ({ ...v, [key]: next }))
    startTransition(async () => {
      const result = await updateNotificationPreferences({ [key]: next })
      if (result.ok) {
        feedback.selection()
      } else {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        setValues((v) => ({ ...v, [key]: !next }))
        router.refresh()
      }
    })
  }

  return (
    <>
      <SettingsSection title={t('profile.sectionPreferences')}>
        <SettingsToggleRow
          icon="bell"
          label={t('profile.notificationsManage.dailyReminder')}
          helper={t('profile.notificationsManage.dailyReminderHelper')}
          checked={values.notifyDailyReminder}
          onChange={(v) => toggle('notifyDailyReminder', v)}
        />
        <SettingsToggleRow
          icon="dollar"
          label={t('profile.notificationsManage.budgetAlerts')}
          helper={t('profile.notificationsManage.budgetAlertsHelper')}
          checked={values.notifyBudgetAlerts}
          onChange={(v) => toggle('notifyBudgetAlerts', v)}
        />
        <SettingsToggleRow
          icon="calendar"
          label={t('profile.notificationsManage.weeklySummary')}
          helper={t('profile.notificationsManage.weeklySummaryHelper')}
          checked={values.notifyWeeklySummary}
          onChange={(v) => toggle('notifyWeeklySummary', v)}
        />
      </SettingsSection>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </>
  )
}
