import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { getExpenseById, getSystemAndUserCategories, getWallets } from '@/server/services/expenses'
import { CategoryChip } from '@/components/ui/category-chip'
import { Card } from '@/components/ui/card'
import { formatMoney } from '@/lib/money'
import { fullDateLabel, timeLabel } from '@/lib/dates'
import { getServerTranslator } from '@/i18n/locale-server'
import { categoryLabel } from '@/i18n/category-label'
import { DetailActions } from './detail-actions'

export const metadata: Metadata = { title: 'Transaction' }

export default async function TransactionDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!
  const { id } = await props.params
  const expense = await getExpenseById(user.id, id)
  if (!expense) notFound()

  const [categories, wallets, { locale, t }] = await Promise.all([
    getSystemAndUserCategories(user.id),
    getWallets(user.id),
    getServerTranslator(),
  ])
  const date = new Date(expense.expenseDate)

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center gap-2">
        <Link
          href="/transactions"
          aria-label={t('transactions.backAria')}
          className="flex size-11 items-center justify-center rounded-full bg-surface-sunken"
        >
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <h1 className="text-title-screen">{t('transactions.detailTitle')}</h1>
      </div>

      <Card className="flex flex-col items-center p-6 text-center">
        <CategoryChip icon={expense.category.icon} color={expense.category.color} size="lg" />
        <p className="tnum text-display-amount mt-3">
          −{formatMoney(expense.amount, { currency: expense.currency, locale })}
        </p>
        <p className="mt-1 text-title-card">{expense.description}</p>
        <p className="text-meta">
          {fullDateLabel(date, locale)} · {timeLabel(date, locale)}
        </p>
      </Card>

      <Card className="divide-y divide-border-subtle px-4">
        <DetailRow label={t('transactions.category')} value={categoryLabel(t, expense.category)} />
        {expense.wallet && <DetailRow label={t('transactions.paidFrom')} value={expense.wallet.name} />}
        {expense.merchant && <DetailRow label={t('expenses.merchant')} value={expense.merchant} />}
        {expense.note && <DetailRow label={t('expenses.note')} value={expense.note} />}
      </Card>

      <DetailActions
        expense={expense}
        categories={categories.map((c) => ({
          id: c.id,
          name: categoryLabel(t, c),
          children: c.children.map((ch) => ({ id: ch.id, name: categoryLabel(t, ch) })),
        }))}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="text-meta">{label}</span>
      <span className="truncate text-title-card">{value}</span>
    </div>
  )
}
