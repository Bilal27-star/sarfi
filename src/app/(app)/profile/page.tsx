import type { Metadata } from 'next'
import { getCurrentUser } from '@/server/auth/session'
import { getOverallBudget } from '@/server/services/expenses'
import { db } from '@/server/db'
import { formatMoney } from '@/lib/money'
import { getServerTranslator } from '@/i18n/locale-server'
import { localeFromDbLang } from '@/i18n/config'
import { ProfileSettings, SettingsRow, SettingsSection, SignOutButton } from './profile-settings'
import { AppearanceRow } from './appearance-row'
import { AvatarEditor } from './avatar-editor'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const user = (await getCurrentUser())!
  const { locale, t } = await getServerTranslator()
  const [budget, walletCount, expenseCount, streakDays, categoryCount, recurringCount] = await Promise.all([
    getOverallBudget(user.id),
    db.wallet.count({ where: { userId: user.id, isArchived: false } }),
    db.expense.count({ where: { userId: user.id } }),
    db.dailyTracking.count({ where: { userId: user.id, trackingCompleted: true } }),
    db.category.count({ where: { parentId: null, OR: [{ userId: null }, { userId: user.id, isArchived: false }] } }),
    db.recurringExpense.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="space-y-7 py-5">
      <h1 className="text-title-screen">{t('profile.title')}</h1>

      {/* Identity — open, no card */}
      <div className="flex items-center gap-4">
        <AvatarEditor name={user.name} avatarUrl={user.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-card text-lg">{user.name}</p>
          <p className="truncate text-sm font-medium text-text-muted">{user.email}</p>
        </div>
      </div>

      {/* Inline stat row, not repeated boxed cards */}
      <div className="flex divide-x divide-border-subtle rtl:divide-x-reverse">
        <Stat value={expenseCount} label={t('profile.statsExpenses', { count: expenseCount })} />
        <Stat value={streakDays} label={t('profile.statsTrackedDays', { count: streakDays })} />
        <Stat value={walletCount} label={t('profile.wallets')} />
      </div>

      <ProfileSettings
        name={user.name}
        language={localeFromDbLang(user.preferredLanguage)}
        monthlyBudget={budget !== null ? String(Math.round(budget)) : ''}
        financialMonthStartDay={user.preferences?.financialMonthStartDay ?? 1}
        currencyLabel={`${user.preferredCurrency} — ${t('setup.dzdLabel')}`}
        budgetDisplay={budget !== null ? formatMoney(budget, { locale, currency: user.preferredCurrency }) : t('common.notSet')}
      />

      {/* Roadmap-safe: visible, honest, de-emphasized rather than hidden or oversold */}
      <SettingsSection title={t('profile.sectionPreferences')}>
        <SettingsRow icon="shapes" label={t('profile.categories')} value={t('profile.categoriesManage.totalCount', { count: categoryCount })} href="/profile/categories" />
        <SettingsRow icon="wallet" label={t('profile.wallets')} value={t('profile.walletsManage.totalCount', { count: walletCount })} href="/profile/wallets" />
        <SettingsRow icon="repeat" label={t('profile.recurringExpenses')} value={t('profile.recurringManage.totalCount', { count: recurringCount })} href="/profile/recurring" />
        <SettingsRow icon="bell" label={t('profile.notifications')} href="/profile/notifications" />
        <AppearanceRow />
      </SettingsSection>

      <SettingsSection title={t('profile.sectionData')}>
        <SettingsRow icon="download" label={t('profile.exportData')} soon />
        <SettingsRow icon="shield" label={t('profile.privacy')} soon />
        <SettingsRow icon="lock" label={t('profile.security')} soon />
      </SettingsSection>

      <SignOutButton />
      <p className="pb-2 text-center text-xs font-medium text-text-muted">
        {t('common.appName')} · صرفي — {t('common.tagline')}
      </p>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 px-2 text-center first:ps-0 last:pe-0">
      <p className="tnum text-title-card text-lg">{value}</p>
      <p className="text-caption text-text-muted">{label}</p>
    </div>
  )
}
