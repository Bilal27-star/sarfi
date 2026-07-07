'use client'

import Link from 'next/link'
import { CategoryChip } from '@/components/ui/category-chip'
import { formatMoney } from '@/lib/money'
import { timeLabel } from '@/lib/dates'
import { useLocale, useT } from '@/i18n/provider'
import { categoryLabel } from '@/i18n/category-label'
import type { ExpenseDTO } from '@/server/services/expenses'

type Props = {
  expense: ExpenseDTO
  showTime?: boolean
  href?: string
}

/** Compact row used in previews (Home's recent list). The full Transactions
 * list uses TransactionRow, which adds swipe actions. */
export function ExpenseRow({ expense, showTime = true, href }: Props) {
  const locale = useLocale()
  const t = useT()
  const category = categoryLabel(t, expense.category)
  const content = (
    <>
      <CategoryChip icon={expense.category.icon} color={expense.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-title-card leading-tight">{expense.description}</p>
        <p className="truncate text-meta">
          {category}
          {expense.merchant ? ` · ${expense.merchant}` : showTime ? ` · ${timeLabel(new Date(expense.expenseDate), locale)}` : ''}
        </p>
      </div>
      <p className="tnum text-amount shrink-0">
        −{formatMoney(expense.amount, { currency: expense.currency, locale })}
      </p>
    </>
  )

  const className = 'flex min-h-14 w-full items-center gap-3 py-2.5 text-start'
  if (href) {
    return (
      <Link href={href} className={`${className} rounded-md px-2 -mx-2 transition-colors hover:bg-surface-sunken active:bg-surface-sunken`}>
        {content}
      </Link>
    )
  }
  return <div className={className}>{content}</div>
}
