import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { getRecurringForManagement } from '@/server/services/recurring'
import { getSystemAndUserCategories, getWallets } from '@/server/services/expenses'
import { getServerTranslator } from '@/i18n/locale-server'
import { RecurringManager } from './recurring-manager'

export const metadata: Metadata = { title: 'Recurring expenses' }

export default async function RecurringPage() {
  const user = (await getCurrentUser())!
  const [recurring, categories, wallets, { t }] = await Promise.all([
    getRecurringForManagement(user.id),
    getSystemAndUserCategories(user.id),
    getWallets(user.id),
    getServerTranslator(),
  ])

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
        <h1 className="text-title-screen">{t('profile.recurringExpenses')}</h1>
      </div>
      <RecurringManager
        initialRecurring={recurring}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color,
          children: c.children.map((ch) => ({ id: ch.id, name: ch.name, slug: ch.slug, icon: ch.icon, color: ch.color })),
        }))}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
        currency={user.preferredCurrency}
      />
    </div>
  )
}
