'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { Copy, Trash2 } from 'lucide-react'
import { CategoryChip } from '@/components/ui/category-chip'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { formatMoney } from '@/lib/money'
import { timeLabel } from '@/lib/dates'
import { useDir, useLocale, useT } from '@/i18n/provider'
import { categoryLabel } from '@/i18n/category-label'
import { resolveActionError } from '@/i18n/action-error'
import { deleteExpense, duplicateExpense } from '@/server/services/expense-actions'
import type { ExpenseDTO } from '@/server/services/expenses'

const REVEAL = 152

/**
 * Transaction row with swipe-to-reveal actions. The reveal panel always sits
 * at the row's trailing edge (end in LTR, start in RTL) so the gesture feels
 * native in both directions. Delete always requires a confirmation tap —
 * the swipe only reveals the button, it never deletes directly.
 */
export function TransactionRow({ expense }: { expense: ExpenseDTO }) {
  const router = useRouter()
  const locale = useLocale()
  const dir = useDir()
  const t = useT()
  const reduced = useReducedMotion()
  const controls = useAnimationControls()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sign = dir === 'rtl' ? 1 : -1
  const didDragRef = useRef(false)

  function close() {
    controls.start({ x: 0 }, { type: 'spring', stiffness: 500, damping: 40 })
  }

  async function onDuplicate() {
    close()
    setPending(true)
    const result = await duplicateExpense(expense.id)
    setPending(false)
    if (!result.ok) setError(resolveActionError(t, result.errorCode))
    else router.refresh()
  }

  async function onDelete() {
    setPending(true)
    const result = await deleteExpense(expense.id)
    setPending(false)
    if (!result.ok) {
      setError(resolveActionError(t, result.errorCode))
      return
    }
    setConfirmDelete(false)
  }

  const category = categoryLabel(t, expense.category)

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-1 flex items-stretch gap-1.5"
        style={{ [dir === 'rtl' ? 'left' : 'right']: 0 }}
      >
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={t('transactions.duplicate')}
          className="flex w-16 flex-col items-center justify-center gap-1 rounded-md bg-info-soft text-info"
        >
          <Copy className="size-4.5" aria-hidden />
          <span className="text-[11px] font-bold">{t('transactions.duplicate')}</span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={t('transactions.delete')}
          className="flex w-16 flex-col items-center justify-center gap-1 rounded-md bg-danger-soft text-danger"
        >
          <Trash2 className="size-4.5" aria-hidden />
          <span className="text-[11px] font-bold">{t('transactions.delete')}</span>
        </button>
      </div>

      <motion.div
        drag={reduced ? false : 'x'}
        dragConstraints={{ left: dir === 'rtl' ? 0 : -REVEAL, right: dir === 'rtl' ? REVEAL : 0 }}
        dragElastic={0.05}
        animate={controls}
        onDragStart={() => {
          didDragRef.current = true
        }}
        onDragEnd={(_, info) => {
          const past = sign * info.offset.x > REVEAL / 2
          controls.start({ x: past ? sign * -REVEAL : 0 }, { type: 'spring', stiffness: 500, damping: 40 })
        }}
        className="relative bg-background"
      >
        <Link
          href={`/transactions/${expense.id}`}
          onClick={(e) => {
            // A drag gesture ending in a click shouldn't also navigate.
            if (didDragRef.current) {
              e.preventDefault()
              didDragRef.current = false
            }
          }}
          className="flex min-h-16 w-full items-center gap-3 py-3 text-start active:bg-surface-sunken"
        >
          <CategoryChip icon={expense.category.icon} color={expense.category.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-title-card leading-tight">{expense.description}</p>
            <p className="truncate text-meta">
              {category}
              {expense.merchant ? ` · ${expense.merchant}` : ` · ${timeLabel(new Date(expense.expenseDate), locale)}`}
            </p>
          </div>
          <p className="tnum text-amount shrink-0">
            −{formatMoney(expense.amount, { currency: expense.currency, locale })}
          </p>
        </Link>
      </motion.div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('transactions.deleteConfirmTitle')}>
        <p className="text-text-secondary">{t('transactions.deleteConfirmMessage', { description: expense.description })}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('transactions.keepIt')}
          </Button>
          <Button variant="danger" onClick={onDelete} loading={pending}>
            {t('transactions.delete')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
