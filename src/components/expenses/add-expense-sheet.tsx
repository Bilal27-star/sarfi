'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronLeft, Delete } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CategoryChip } from '@/components/ui/category-chip'
import { successPop } from '@/components/motion/presets'
import { createExpense } from '@/server/services/expense-actions'
import { resolveActionError } from '@/i18n/action-error'
import { useLocale, useT } from '@/i18n/provider'
import { categoryLabel } from '@/i18n/category-label'
import { formatMoney, isValidAmountInput } from '@/lib/money'
import { toDateInputValue } from '@/lib/dates'
import { cn } from '@/lib/utils'

export type AddExpenseData = {
  categories: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
    children: { id: string; name: string; slug: string; icon: string; color: string }[]
  }[]
  wallets: { id: string; name: string; icon: string }[]
  currency: string
}

const QUICK_KEYS = ['pizza', 'coffee', 'fuel', 'chicken', 'vegetables', 'bread', 'taxi', 'pharmacy'] as const

type Step = 'amount' | 'description' | 'category'

export function AddExpenseSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: AddExpenseData }) {
  const router = useRouter()
  const locale = useLocale()
  const t = useT()
  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [walletId, setWalletId] = useState<string>(data.wallets[0]?.id ?? '')
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [note, setNote] = useState('')
  const [merchant, setMerchant] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, startSaving] = useTransition()
  const descriptionRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('amount')
    setAmount('')
    setDescription('')
    setCategoryId(null)
    setSubcategoryId(null)
    setMoreOpen(false)
    setNote('')
    setMerchant('')
    setError(null)
    setSuccess(false)
    setDate(toDateInputValue(new Date()))
  }, [])

  // Reset to a fresh entry each time the sheet opens (derived-state-during-render pattern)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset()
  }

  const selectedCategory = useMemo(
    () => data.categories.find((c) => c.id === categoryId) ?? null,
    [categoryId, data.categories],
  )

  const amountValid = isValidAmountInput(amount || '0') && Number(amount) > 0

  function pressKey(key: string) {
    setError(null)
    setAmount((prev) => {
      if (key === 'back') return prev.slice(0, -1)
      if (key === '.') {
        if (prev.includes('.')) return prev
        return prev === '' ? '0.' : prev + '.'
      }
      const next = prev === '0' && key !== '.' ? key : prev + key
      // max 10 integer digits, 2 decimals
      const [int, frac] = next.split('.')
      if (int.length > 10 || (frac?.length ?? 0) > 2) return prev
      return next
    })
  }

  function save() {
    if (!categoryId) {
      setError(t('expenses.pickCategoryError'))
      return
    }
    setError(null)
    startSaving(async () => {
      const result = await createExpense({
        amount: Number(amount).toFixed(2),
        description: description.trim(),
        categoryId: subcategoryId ?? categoryId,
        walletId: walletId || undefined,
        merchant: merchant.trim() || undefined,
        note: note.trim() || undefined,
        expenseDate: date !== toDateInputValue(new Date()) ? date : undefined,
      })
      if (!result.ok) {
        setError(resolveActionError(t, result.errorCode))
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(onClose, 950)
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={success ? t('expenses.savedTitle') : t('expenses.title')}>
      {success ? (
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            variants={successPop}
            initial="initial"
            animate="animate"
            className="flex size-20 items-center justify-center rounded-full bg-primary"
          >
            <Check className="size-10 text-text-on-primary" strokeWidth={3} aria-hidden />
          </motion.div>
          <p className="tnum text-display-amount mt-4">
            {formatMoney(Number(amount), { currency: data.currency, locale })}
          </p>
          <p className="mt-1 text-text-muted font-medium">{description}</p>
        </div>
      ) : (
        <div className="pb-2">
          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-2" aria-hidden>
            {(['amount', 'description', 'category'] as Step[]).map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  step === s ? 'bg-primary' : 'bg-surface-sunken',
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {step === 'amount' && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-meta">{t('expenses.amountQuestion')}</p>
                <p className="tnum mt-1 mb-4 min-h-14 text-[clamp(2.25rem,10vw,3rem)] font-display font-bold leading-tight break-all">
                  {amount || '0'}
                  <span className="ms-2 text-xl font-bold text-text-muted">{data.currency}</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pressKey(key)}
                      aria-label={key === 'back' ? t('expenses.deleteDigitAria') : key}
                      className="tnum flex h-14 items-center justify-center rounded-md bg-surface-sunken text-xl font-bold transition active:scale-95 active:bg-border-subtle"
                    >
                      {key === 'back' ? <Delete className="size-6" aria-hidden /> : key}
                    </button>
                  ))}
                </div>
                <Button
                  full
                  size="lg"
                  className="mt-4"
                  disabled={!amountValid}
                  onClick={() => {
                    setStep('description')
                    setTimeout(() => descriptionRef.current?.focus(), 250)
                  }}
                >
                  {t('expenses.continueLabel')}
                </Button>
              </motion.div>
            )}

            {step === 'description' && (
              <motion.div
                key="description"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <BackRow onBack={() => setStep('amount')} amount={amount} data={data} />
                <label htmlFor="expense-description" className="mt-4 block text-meta">
                  {t('expenses.whatWasIt')}
                </label>
                <input
                  ref={descriptionRef}
                  id="expense-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && description.trim()) setStep('category')
                  }}
                  placeholder={t('expenses.descriptionPlaceholder')}
                  maxLength={120}
                  className="mt-2 h-13 w-full rounded-md border border-border-strong bg-surface px-4 text-lg font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_KEYS.map((key) => {
                    const label = t(`expenses.quick.${key}`)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setDescription(label)
                          setStep('category')
                        }}
                        className="rounded-full border border-border-subtle bg-surface px-3.5 py-2 text-sm font-semibold text-text-secondary transition active:scale-95 hover:border-primary hover:text-success"
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <Button full size="lg" className="mt-5" disabled={!description.trim()} onClick={() => setStep('category')}>
                  {t('expenses.continueLabel')}
                </Button>
              </motion.div>
            )}

            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <BackRow onBack={() => setStep('description')} amount={amount} data={data} description={description} />
                <p className="mt-4 mb-2 text-meta">{t('expenses.category')}</p>
                <div role="radiogroup" aria-label={t('expenses.category')} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {data.categories.map((category) => {
                    const active = category.id === categoryId
                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setCategoryId(category.id)
                          setSubcategoryId(null)
                          setError(null)
                        }}
                        className={cn(
                          'flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-md border p-1.5 transition active:scale-95',
                          active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface hover:border-border-strong',
                        )}
                      >
                        <CategoryChip icon={category.icon} color={category.color} size="sm" />
                        <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
                          {categoryLabel(t, category)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {selectedCategory && selectedCategory.children.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none py-0.5" role="radiogroup" aria-label={t('expenses.subcategoryAria')}>
                    {selectedCategory.children.map((sub) => {
                      const active = sub.id === subcategoryId
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setSubcategoryId(active ? null : sub.id)}
                          className={cn(
                            'shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition active:scale-95',
                            active ? 'border-primary bg-primary-soft text-success' : 'border-border-subtle bg-surface text-text-secondary',
                          )}
                        >
                          {categoryLabel(t, sub)}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Progressive disclosure: advanced fields */}
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="mt-4 flex items-center gap-1 text-sm font-bold text-info"
                >
                  {t('expenses.moreOptions')}
                  <ChevronDown className={cn('size-4 transition-transform', moreOpen && 'rotate-180')} aria-hidden />
                </button>
                <AnimatePresence initial={false}>
                  {moreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-text-secondary">
                          {t('expenses.date')}
                          <input
                            type="date"
                            value={date}
                            max={toDateInputValue(new Date())}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-3 font-medium"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-text-secondary">
                          {t('expenses.wallet')}
                          <select
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                            className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-3 font-medium"
                          >
                            {data.wallets.map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                {wallet.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-semibold text-text-secondary">
                          {t('expenses.merchant')}
                          <input
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                            placeholder={t('expenses.optional')}
                            maxLength={120}
                            className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-3 font-medium"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-text-secondary">
                          {t('expenses.note')}
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('expenses.optional')}
                            maxLength={500}
                            className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-3 font-medium"
                          />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-danger">
                    {error}
                  </p>
                )}
                <Button full size="lg" className="mt-4" loading={saving} disabled={!categoryId} onClick={save}>
                  {t('expenses.saveExpense')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Sheet>
  )
}

function BackRow({
  onBack,
  amount,
  data,
  description,
}: {
  onBack: () => void
  amount: string
  data: AddExpenseData
  description?: string
}) {
  const locale = useLocale()
  const t = useT()
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-11 items-center gap-1 rounded-sm pe-2 text-sm font-bold text-text-secondary"
      >
        <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
        {t('expenses.back')}
      </button>
      <p className="tnum text-lg font-extrabold">
        {formatMoney(Number(amount || 0), { currency: data.currency, locale })}
        {description && <span className="ms-2 text-sm font-semibold text-text-muted">· {description}</span>}
      </p>
    </div>
  )
}
