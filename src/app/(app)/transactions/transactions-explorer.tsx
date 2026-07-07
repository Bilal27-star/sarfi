'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, SearchX, X } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { TransactionRow } from '@/components/expenses/transaction-row'
import { useLocale, useT } from '@/i18n/provider'
import { categoryLabel } from '@/i18n/category-label'
import { formatMoney } from '@/lib/money'
import { dayLabel, toDateInputValue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ExpenseDTO } from '@/server/services/expenses'

type CategoryOption = { id: string; slug: string; name: string }
type WalletOption = { id: string; name: string }

type Props = {
  expenses: ExpenseDTO[]
  categories: CategoryOption[]
  wallets: WalletOption[]
}

export function TransactionsExplorer({ expenses, categories, wallets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useT()

  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if ((searchParams.get('q') ?? '') !== query) setParam('q', query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const activeCategory = searchParams.get('category') ?? ''
  const advancedFilters = (['wallet', 'from', 'to', 'min', 'max'] as const).filter((k) => searchParams.get(k))
  const hasAnyFilter = Boolean(activeCategory || query || advancedFilters.length > 0)
  const walletName = wallets.find((w) => w.id === searchParams.get('wallet'))?.name

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

  const groups = useMemo(() => {
    const list: { key: string; label: string; total: number; items: ExpenseDTO[] }[] = []
    for (const expense of expenses) {
      const date = new Date(expense.expenseDate)
      const key = date.toDateString()
      const last = list[list.length - 1]
      if (last && last.key === key) {
        last.items.push(expense)
        last.total += Number(expense.amount)
      } else {
        list.push({ key, label: dayLabel(date, locale, t), total: Number(expense.amount), items: [expense] })
      }
    }
    return list
  }, [expenses, locale, t])

  return (
    <div className="py-5">
      {/* Title / period summary / search & filter entry points */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="relative flex-1"
            >
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4.5 text-text-muted" aria-hidden />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder={t('transactions.searchPlaceholder')}
                aria-label={t('transactions.searchAria')}
                className="h-10 w-full rounded-full border border-border-strong bg-surface ps-9 pe-9 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setParam('q', '')
                  setSearchOpen(false)
                }}
                aria-label={t('common.cancel')}
                className="absolute inset-y-0 end-1.5 my-auto flex size-7 items-center justify-center rounded-full text-text-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="min-w-0"
            >
              <h1 className="text-title-screen truncate">{t('transactions.title')}</h1>
              <p className="tnum text-meta">{t('transactions.spentPeriod', { amount: formatMoney(total, { locale }) })}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!searchOpen && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 180)
              }}
              aria-label={t('transactions.searchAria')}
              className="flex size-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-sunken"
            >
              <Search className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label={t('transactions.filtersAria')}
              className={cn(
                'relative flex size-10 items-center justify-center rounded-full',
                advancedFilters.length > 0 ? 'bg-primary-soft text-success' : 'text-text-secondary hover:bg-surface-sunken',
              )}
            >
              <SlidersHorizontal className="size-5" aria-hidden />
              {advancedFilters.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-text-on-primary">
                  {advancedFilters.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Quick category chips */}
      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto scrollbar-none px-4 sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={() => setParam('category', '')}
          className={cn(
            'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition',
            !activeCategory ? 'border-primary bg-primary-soft text-success' : 'border-border-subtle text-text-secondary',
          )}
        >
          {t('transactions.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setParam('category', activeCategory === c.id ? '' : c.id)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold transition',
              activeCategory === c.id ? 'border-primary bg-primary-soft text-success' : 'border-border-subtle text-text-secondary',
            )}
          >
            {categoryLabel(t, c)}
          </button>
        ))}
      </div>

      {/* Active advanced filters */}
      {advancedFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchParams.get('wallet') && (
            <FilterChip label={walletName ?? searchParams.get('wallet')!} onRemove={() => setParam('wallet', '')} removeLabel={t('transactions.removeFilter')} />
          )}
          {(searchParams.get('from') || searchParams.get('to')) && (
            <FilterChip
              label={`${searchParams.get('from') ?? '…'} → ${searchParams.get('to') ?? '…'}`}
              removeLabel={t('transactions.removeFilter')}
              onRemove={() => {
                setParam('from', '')
                setParam('to', '')
              }}
            />
          )}
          {(searchParams.get('min') || searchParams.get('max')) && (
            <FilterChip
              label={`${searchParams.get('min') ?? '0'}–${searchParams.get('max') ?? '∞'}`}
              removeLabel={t('transactions.removeFilter')}
              onRemove={() => {
                setParam('min', '')
                setParam('max', '')
              }}
            />
          )}
        </div>
      )}

      {/* List */}
      {groups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={hasAnyFilter ? t('transactions.noResultsTitle') : t('transactions.noExpensesTitle')}
          message={hasAnyFilter ? t('transactions.noResultsMessage') : t('transactions.noExpensesMessage')}
          className="mt-6"
        />
      ) : (
        <div className="mt-3">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
                <h2 className="text-caption text-text-secondary">{group.label}</h2>
                <span className="tnum text-caption text-text-muted">
                  {group.items.length} · {formatMoney(group.total, { locale, withSuffix: false })}
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {group.items.map((expense) => (
                  <TransactionRow key={expense.id} expense={expense} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Filter sheet */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('transactions.filtersAria')}>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <label className="text-xs font-bold text-text-secondary">
            {t('transactions.wallet')}
            <select
              value={searchParams.get('wallet') ?? ''}
              onChange={(e) => setParam('wallet', e.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm font-medium"
            >
              <option value="">{t('transactions.all')}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <div />
          <label className="text-xs font-bold text-text-secondary">
            {t('transactions.from')}
            <input
              type="date"
              max={toDateInputValue(new Date())}
              value={searchParams.get('from') ?? ''}
              onChange={(e) => setParam('from', e.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm font-medium"
            />
          </label>
          <label className="text-xs font-bold text-text-secondary">
            {t('transactions.to')}
            <input
              type="date"
              max={toDateInputValue(new Date())}
              value={searchParams.get('to') ?? ''}
              onChange={(e) => setParam('to', e.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm font-medium"
            />
          </label>
          <label className="text-xs font-bold text-text-secondary">
            {t('transactions.minAmount')}
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={searchParams.get('min') ?? ''}
              onChange={(e) => setParam('min', e.target.value)}
              className="tnum mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm font-medium"
            />
          </label>
          <label className="text-xs font-bold text-text-secondary">
            {t('transactions.maxAmount')}
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={searchParams.get('max') ?? ''}
              onChange={(e) => setParam('max', e.target.value)}
              className="tnum mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm font-medium"
            />
          </label>
        </div>
        <p className="tnum text-sm font-semibold text-text-muted">
          {t('transactions.resultsCount', { count: expenses.length })}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              router.replace(pathname, { scroll: false })
              setQuery('')
            }}
          >
            {t('common.reset')}
          </Button>
          <Button onClick={() => setFilterOpen(false)}>{t('common.apply')}</Button>
        </div>
      </Sheet>
    </div>
  )
}

function FilterChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken ps-3 pe-1.5 py-1 text-xs font-bold text-text-secondary">
      {label}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="flex size-5 items-center justify-center rounded-full hover:bg-border-subtle">
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  )
}
