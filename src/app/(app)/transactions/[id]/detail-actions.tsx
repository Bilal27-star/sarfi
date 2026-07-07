'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { deleteExpense, duplicateExpense, updateExpense } from '@/server/services/expense-actions'
import { moneyString } from '@/lib/validation/expense'
import { toDateInputValue } from '@/lib/dates'
import { useT } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'
import type { ExpenseDTO } from '@/server/services/expenses'

const editSchema = z.object({
  amount: moneyString,
  description: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1),
  walletId: z.string().optional(),
  merchant: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  expenseDate: z.string().min(1),
})
type EditValues = z.infer<typeof editSchema>

type Props = {
  expense: ExpenseDTO
  categories: { id: string; name: string; children: { id: string; name: string }[] }[]
  wallets: { id: string; name: string }[]
}

export function DetailActions({ expense, categories, wallets }: Props) {
  const router = useRouter()
  const t = useT()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      amount: Number(expense.amount) % 1 === 0 ? String(Number(expense.amount)) : expense.amount,
      description: expense.description,
      categoryId: expense.category.id,
      walletId: expense.wallet?.id ?? '',
      merchant: expense.merchant ?? '',
      note: expense.note ?? '',
      expenseDate: toDateInputValue(new Date(expense.expenseDate)),
    },
  })

  const onEdit = handleSubmit(async (values) => {
    setError(null)
    const result = await updateExpense({
      id: expense.id,
      ...values,
      amount: Number(values.amount).toFixed(2),
      walletId: values.walletId || undefined,
      merchant: values.merchant || undefined,
      note: values.note || undefined,
    })
    if (!result.ok) {
      setError(resolveActionError(t, result.errorCode))
      return
    }
    setEditOpen(false)
    router.refresh()
  })

  function onDuplicate() {
    startTransition(async () => {
      const result = await duplicateExpense(expense.id)
      if (result.ok) router.push('/transactions')
      else setError(resolveActionError(t, result.errorCode))
    })
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expense.id)
      if (result.ok) router.push('/transactions')
      else setError(resolveActionError(t, result.errorCode))
    })
  }

  const inputClass =
    'mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-3 font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25'

  return (
    <>
      {error && (
        <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" aria-hidden />
          {t('transactions.edit')}
        </Button>
        <Button variant="secondary" onClick={onDuplicate} loading={pending && !confirmDelete}>
          <Copy className="size-4" aria-hidden />
          {t('transactions.duplicate')}
        </Button>
        <Button variant="secondary" className="text-danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" aria-hidden />
          {t('transactions.delete')}
        </Button>
      </div>

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={`${t('transactions.edit')} · ${expense.description}`}>
        <form onSubmit={onEdit} className="space-y-3 pt-1">
          <label className="block text-sm font-semibold text-text-secondary">
            {t('expenses.amountQuestion')}
            <input {...register('amount')} inputMode="decimal" className={`tnum ${inputClass}`} />
            {errors.amount && <span role="alert" className="text-xs font-semibold text-danger">{errors.amount.message}</span>}
          </label>
          <label className="block text-sm font-semibold text-text-secondary">
            {t('expenses.whatWasIt')}
            <input {...register('description')} className={inputClass} />
            {errors.description && (
              <span role="alert" className="text-xs font-semibold text-danger">{t('validation.descriptionRequired')}</span>
            )}
          </label>
          <label className="block text-sm font-semibold text-text-secondary">
            {t('expenses.category')}
            <select {...register('categoryId')} className={inputClass}>
              {categories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name}</option>
                  {c.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {c.name} · {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-text-secondary">
              {t('expenses.date')}
              <input type="date" max={toDateInputValue(new Date())} {...register('expenseDate')} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-text-secondary">
              {t('expenses.wallet')}
              <select {...register('walletId')} className={inputClass}>
                <option value="">{t('common.none')}</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-text-secondary">
            {t('expenses.merchant')}
            <input {...register('merchant')} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold text-text-secondary">
            {t('expenses.note')}
            <input {...register('note')} className={inputClass} />
          </label>
          <Button full size="lg" type="submit" loading={isSubmitting} className="mt-2">
            {t('transactions.saveChanges')}
          </Button>
        </form>
      </Sheet>

      {/* Delete confirmation */}
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('transactions.deleteConfirmTitle')}>
        <p className="text-text-secondary">{t('transactions.deleteConfirmMessage', { description: expense.description })}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('transactions.keepIt')}
          </Button>
          <Button variant="danger" onClick={onDelete} loading={pending}>
            {t('transactions.delete')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
