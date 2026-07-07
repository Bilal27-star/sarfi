'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
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
  const reducedMotion = useReducedMotion()

  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expanded title/total block fades and drifts up as it scrolls under the
  // sticky controls row — a native-feeling collapse rather than a hard cut.
  const headerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: headerProgress } = useScroll({ target: headerRef, offset: ['start start', 'end start'] })
  const headerOpacity = useTransform(headerProgress, [0, 1], [1, 0])
  const headerY = useTransform(headerProgress, [0, 1], [0, -8])

  // A zero-height sentinel just above the sticky row: once it scrolls past
  // the viewport top, the row is genuinely "stuck", so we can fade in its
  // compact background/border treatment instead of showing it permanently.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), { threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Measure the sticky row's real height (it varies slightly by locale —
  // longer French/Arabic labels, different font metrics) so the per-day
  // group headers below can stick flush beneath it instead of guessing a
  // fixed pixel value. The variable is set on the shared root ancestor —
  // custom properties don't cascade to siblings, only descendants.
  const rootRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const controls = controlsRef.current
    const root = rootRef.current
    if (!controls || !root) return
    const setHeight = () => root.style.setProperty('--transactions-sticky-h', `${controls.offsetHeight}px`)
    setHeight()
    const observer = new ResizeObserver(setHeight)
    observer.observe(controls)
    return () => observer.disconnect()
  }, [])

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
    <div ref={rootRef} className="py-5">
      {/* Expanded header — title + period summary. Scrolls away naturally;
          a subtle scroll-linked fade makes the collapse feel intentional. */}
      <motion.div
        ref={headerRef}
        style={reducedMotion ? undefined : { opacity: headerOpacity, y: headerY }}
        className="min-w-0"
      >
        <h1 className="text-title-screen truncate">{t('transactions.title')}</h1>
        <p className="tnum text-meta">{t('transactions.spentPeriod', { amount: formatMoney(total, { locale }) })}</p>
      </motion.div>

      <div ref={sentinelRef} aria-hidden className="h-0" />

      {/* Sticky controls — search, filter, category chips. Always present in
          flow; gains a translucent/blur/border treatment only once actually
          stuck to the viewport top, so it doesn't look like a floating card
          while still part of the expanded layout. */}
      <div
        ref={controlsRef}
        className={cn(
          'sticky top-safe z-20 -mx-4 border-b px-4 py-2.5 transition-colors duration-200 sm:-mx-6 sm:px-6',
          isStuck ? 'border-border-subtle bg-background/90 shadow-[0_1px_0_0_rgba(24,34,27,0.04)] backdrop-blur-md' : 'border-transparent bg-background',
        )}
      >
        <div className="flex min-h-10 items-center gap-2">
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
                key="controls"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(true)
                      // preventScroll: the input is already visible (sticky at top) at any
                      // scroll depth — without this, focusing it can yank the page back to top.
                      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 180)
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

                {/* Category chips */}
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active advanced filters — supplementary, scrolls away with content */}
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
              <div className="top-safe-controls sticky z-10 -mx-4 flex items-baseline justify-between bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
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
