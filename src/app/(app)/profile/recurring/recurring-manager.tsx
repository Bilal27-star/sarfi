'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { CategoryChip } from '@/components/ui/category-chip'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { categoryLabel } from '@/i18n/category-label'
import { useT, useLocale } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'
import { formatMoney } from '@/lib/money'
import { toDateInputValue } from '@/lib/dates'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import type { ManagedRecurring } from '@/server/services/recurring'
import { createRecurring, deleteRecurring, toggleRecurringActive, updateRecurring } from '@/server/services/recurring-actions'

type Frequency = ManagedRecurring['frequency']

type CategoryOption = {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  children: { id: string; name: string; slug: string; icon: string; color: string }[]
}

type WalletOption = { id: string; name: string }

type EditTarget = { mode: 'create' } | { mode: 'edit'; recurring: ManagedRecurring } | null

type SavedRecurring = {
  id: string
  description: string
  amount: string
  currency: string
  categoryId: string
  walletId: string | null
  frequency: Frequency
  nextDueDate: string
  isActive: boolean
}

/** The server action only round-trips IDs for category/wallet (it doesn't
 * know the client's already-loaded picker data) — rebuild the full display
 * row from the categories/wallets already available here, so the saved
 * template shows up immediately without a full page reload. */
function toManagedRecurring(saved: SavedRecurring, categories: CategoryOption[], wallets: WalletOption[]): ManagedRecurring {
  const allCategories = categories.flatMap((c) => [c, ...c.children])
  const category = allCategories.find((c) => c.id === saved.categoryId)!
  const wallet = saved.walletId ? (wallets.find((w) => w.id === saved.walletId) ?? null) : null
  return {
    id: saved.id,
    description: saved.description,
    amount: saved.amount,
    currency: saved.currency,
    frequency: saved.frequency,
    nextDueDate: saved.nextDueDate,
    isActive: saved.isActive,
    category: { id: category.id, name: category.name, slug: category.slug, icon: category.icon, color: category.color },
    wallet,
  }
}

export function RecurringManager({
  initialRecurring,
  categories,
  wallets,
  currency,
}: {
  initialRecurring: ManagedRecurring[]
  categories: CategoryOption[]
  wallets: WalletOption[]
  currency: string
}) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [items, setItems] = useState(initialRecurring)
  const [, startTransition] = useTransition()
  const [target, setTarget] = useState<EditTarget>(null)

  function handleToggleActive(recurring: ManagedRecurring) {
    feedback.tap()
    const next = !recurring.isActive
    setItems(items.map((r) => (r.id === recurring.id ? { ...r, isActive: next } : r)))
    startTransition(async () => {
      const result = await toggleRecurringActive(recurring.id, next)
      if (result.ok) feedback.selection()
      else {
        feedback.error()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" full onClick={() => setTarget({ mode: 'create' })}>
        <Plus className="size-4.5" aria-hidden />
        {t('profile.recurringManage.addRecurring')}
      </Button>

      <div className="space-y-2">
        {items.map((recurring) => {
          return (
            <div
              key={recurring.id}
              className={cn(
                'flex items-center gap-3 rounded-md border border-border-subtle bg-surface p-2.5',
                !recurring.isActive && 'opacity-60',
              )}
            >
              <button type="button" onClick={() => setTarget({ mode: 'edit', recurring })} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                <CategoryChip icon={recurring.category.icon} color={recurring.category.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-title-card">{recurring.description}</span>
                  <span className="flex items-center gap-1 text-caption text-text-muted">
                    <CalendarClock className="size-3" aria-hidden />
                    {t(`profile.recurringManage.freq${recurring.frequency}`)} ·{' '}
                    {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(recurring.nextDueDate))}
                    {' · '}
                    {categoryLabel(t, recurring.category)}
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-bold text-text-secondary">
                  {formatMoney(recurring.amount, { currency: recurring.currency, locale })}
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-muted rtl:rotate-180" aria-hidden />
              </button>
              <Switch
                checked={recurring.isActive}
                onChange={() => handleToggleActive(recurring)}
                label={t(recurring.isActive ? 'profile.recurringManage.active' : 'profile.recurringManage.paused')}
              />
            </div>
          )
        })}
      </div>

      {items.length === 0 && <p className="py-6 text-center text-sm text-text-muted">{t('profile.recurringManage.empty')}</p>}

      <RecurringFormSheet
        target={target}
        categories={categories}
        wallets={wallets}
        currency={currency}
        onClose={() => setTarget(null)}
        onSaved={(saved) => {
          setTarget(null)
          const row = toManagedRecurring(saved, categories, wallets)
          const exists = items.some((r) => r.id === row.id)
          setItems(exists ? items.map((r) => (r.id === row.id ? row : r)) : [...items, row])
        }}
        onDeleted={(id) => {
          setTarget(null)
          setItems(items.filter((r) => r.id !== id))
        }}
      />
    </div>
  )
}

function RecurringFormSheet({
  target,
  categories,
  wallets,
  currency,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: EditTarget
  categories: CategoryOption[]
  wallets: WalletOption[]
  currency: string
  onClose: () => void
  onSaved: (saved: SavedRecurring) => void
  onDeleted: (id: string) => void
}) {
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = target?.mode === 'edit'

  const [description, setDescription] = useState(isEdit ? target.recurring.description : '')
  const [amount, setAmount] = useState(isEdit ? target.recurring.amount : '')
  const [categoryId, setCategoryId] = useState(isEdit ? target.recurring.category.id : categories[0]?.id ?? '')
  const [walletId, setWalletId] = useState(isEdit ? (target.recurring.wallet?.id ?? '') : '')
  const [frequency, setFrequency] = useState<Frequency>(isEdit ? target.recurring.frequency : 'MONTHLY')
  const [nextDueDate, setNextDueDate] = useState(isEdit ? toDateInputValue(new Date(target.recurring.nextDueDate)) : toDateInputValue(new Date()))

  const [openKey, setOpenKey] = useState<string | null>(null)
  const nextKey = target ? (target.mode === 'create' ? 'create' : target.recurring.id) : null
  if (nextKey !== openKey) {
    setOpenKey(nextKey)
    setError(null)
    if (target?.mode === 'edit') {
      setDescription(target.recurring.description)
      setAmount(target.recurring.amount)
      setCategoryId(target.recurring.category.id)
      setWalletId(target.recurring.wallet?.id ?? '')
      setFrequency(target.recurring.frequency)
      setNextDueDate(toDateInputValue(new Date(target.recurring.nextDueDate)))
    } else if (target?.mode === 'create') {
      setDescription('')
      setAmount('')
      setCategoryId(categories[0]?.id ?? '')
      setWalletId('')
      setFrequency('MONTHLY')
      setNextDueDate(toDateInputValue(new Date()))
    }
  }

  function handleSave() {
    setError(null)
    const payload = {
      description: description.trim(),
      amount,
      categoryId,
      walletId: walletId || undefined,
      frequency,
      nextDueDate,
    }
    startTransition(async () => {
      const result = target?.mode === 'create' ? await createRecurring(payload) : await updateRecurring({ id: target!.recurring.id, ...payload })
      if (!result.ok) {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        return
      }
      feedback.success()
      onSaved(result.recurring)
    })
  }

  function handleDelete() {
    if (target?.mode !== 'edit') return
    feedback.destructive()
    startTransition(async () => {
      const result = await deleteRecurring(target.recurring.id)
      if (!result.ok) {
        feedback.error()
        setError(resolveActionError(t, result.errorCode))
        return
      }
      feedback.success()
      onDeleted(target.recurring.id)
    })
  }

  const title = target?.mode === 'create' ? t('profile.recurringManage.newRecurringTitle') : t('profile.recurringManage.editRecurringTitle')
  const valid = description.trim().length > 0 && /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0 && categoryId

  return (
    <Sheet open={target !== null} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-meta">{t('expenses.whatWasIt')}</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder={t('expenses.descriptionPlaceholder')}
            aria-label={t('expenses.whatWasIt')}
            className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-meta">{t('profile.recurringManage.amountLabel')}</label>
          <div className="relative">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
              aria-label={t('profile.recurringManage.amountLabel')}
              className="tnum h-14 w-full rounded-md border border-border-strong bg-surface px-4 pe-16 text-2xl font-extrabold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <span className="absolute inset-y-0 end-4 flex items-center font-bold text-text-muted">{currency}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-meta">{t('expenses.category')}</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((category) => {
              const active = category.id === categoryId
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-md border p-1.5 transition active:scale-95',
                    active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
                  )}
                >
                  <CategoryChip icon={category.icon} color={category.color} size="sm" />
                  <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">{categoryLabel(t, category)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-meta">{t('profile.recurringManage.frequencyLabel')}</label>
          <div className="grid grid-cols-4 gap-2">
            {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Frequency[]).map((opt) => {
              const active = opt === frequency
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFrequency(opt)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-md border p-2.5 text-center text-[11px] font-semibold transition active:scale-95',
                    active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
                  )}
                >
                  {t(`profile.recurringManage.freq${opt}`)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-text-secondary">
            {t('profile.recurringManage.nextDueDateLabel')}
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
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
              <option value="">{t('common.none')}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}

        <Button full size="lg" loading={pending} disabled={!valid} onClick={handleSave}>
          {t('common.save')}
        </Button>

        {isEdit && (
          <div className="border-t border-border-subtle pt-4">
            <Button variant="danger" full loading={pending} onClick={handleDelete}>
              <Trash2 className="size-4.5" aria-hidden />
              {t('profile.recurringManage.deleteRecurring')}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
