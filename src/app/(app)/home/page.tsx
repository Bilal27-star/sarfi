import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ReceiptText, Wallet } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import {
  categoryTotals,
  getOverallBudget,
  getRecentExpenses,
  sumExpenses,
} from '@/server/services/expenses'
import { generateSpendingInsights } from '@/server/services/insights'
import { db } from '@/server/db'
import {
  endOfDay,
  financialMonthRange,
  fullDateLabel,
  greetingKeyFor,
  periodRange,
  previousRange,
  startOfDay,
} from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { ProgressBar } from '@/components/ui/progress'
import { RingGauge } from '@/components/ui/ring-gauge'
import { AnimatedAmount } from '@/components/motion/animated-number'
import { ExpenseRow } from '@/components/expenses/expense-row'
import { InsightCard } from '@/components/insights/insight-card'
import { CategoryBars } from '@/components/insights/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { getServerTranslator } from '@/i18n/locale-server'
import { categoryLabel } from '@/i18n/category-label'
import { localizeInsight } from '@/i18n/localize-insight'
import { HomeAddButton } from './home-add-button'

export const metadata: Metadata = { title: 'Home' }

export default async function HomePage() {
  const user = (await getCurrentUser())!
  const { locale, t } = await getServerTranslator()
  const currency = user.preferredCurrency
  const now = new Date()
  const today = { start: startOfDay(now), end: endOfDay(now) }
  const monthRange = financialMonthRange(now, user.preferences?.financialMonthStartDay ?? 1)
  const weekRange = periodRange('7d', now)
  const prevWeekRange = previousRange(weekRange)

  const [spentToday, monthSpent, budget, recent, weekCategories, prevWeekCategories, weekExpenses, prevWeekExpenses] =
    await Promise.all([
      sumExpenses(user.id, today),
      sumExpenses(user.id, monthRange),
      getOverallBudget(user.id),
      getRecentExpenses(user.id, 4),
      categoryTotals(user.id, weekRange),
      categoryTotals(user.id, prevWeekRange),
      db.expense.findMany({
        where: { userId: user.id, expenseDate: { gte: weekRange.start, lte: weekRange.end } },
        select: { amount: true, expenseDate: true, merchant: true, category: { select: { slug: true, name: true } } },
      }),
      db.expense.findMany({
        where: { userId: user.id, expenseDate: { gte: prevWeekRange.start, lte: prevWeekRange.end } },
        select: { amount: true, expenseDate: true, merchant: true, category: { select: { slug: true, name: true } } },
      }),
    ])

  const daysInMonth = Math.round((monthRange.end.getTime() - monthRange.start.getTime()) / 86_400_000)
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - monthRange.start.getTime()) / 86_400_000))
  const daysLeft = Math.max(0, daysInMonth - daysElapsed)
  const remaining = budget !== null ? budget - monthSpent : null

  // Daily guidance: remaining budget spread across remaining days (incl. today)
  const dailyGuide =
    budget !== null && daysLeft >= 0
      ? Math.max(0, (budget - (monthSpent - spentToday)) / (daysLeft + 1))
      : null

  const insights = generateSpendingInsights({
    expenses: weekExpenses.map((e) => ({
      amount: Number(e.amount),
      date: e.expenseDate,
      categorySlug: e.category.slug,
      categoryName: e.category.name,
      merchant: e.merchant,
    })),
    previousExpenses: prevWeekExpenses.map((e) => ({
      amount: Number(e.amount),
      date: e.expenseDate,
      categorySlug: e.category.slug,
      categoryName: e.category.name,
      merchant: e.merchant,
    })),
    currentCategories: weekCategories.map((c) => ({ name: c.name, slug: c.slug, total: c.total, count: c.count })),
    previousCategories: prevWeekCategories.map((c) => ({ name: c.name, slug: c.slug, total: c.total, count: c.count })),
    budget,
    daysElapsedInMonth: daysElapsed,
    daysInMonth,
    monthSpent,
  })
  const highlight = insights[0] ? localizeInsight(insights[0], t, locale, currency) : null

  const weekTotal = weekCategories.reduce((s, c) => s + c.total, 0)
  const topCategories = weekCategories.slice(0, 3).map((c) => ({ ...c, label: categoryLabel(t, c) }))

  const guideFraction = dailyGuide !== null && dailyGuide > 0 ? spentToday / dailyGuide : dailyGuide === 0 && spentToday > 0 ? 1.4 : 0

  return (
    <div className="pb-5">
      {/* Signature hero band — a soft tinted section, not a dark card */}
      <div className="-mx-4 sm:-mx-6 rounded-b-xl bg-gradient-to-b from-primary-soft to-background px-4 sm:px-6 pt-safe pb-6">
        <header className="flex items-center justify-between gap-3 pt-5">
          <div className="min-w-0">
            <h1 className="truncate text-title-screen">
              {t(`home.${greetingKeyFor(now)}`)}, {user.name.split(' ')[0]}
            </h1>
            <p className="text-meta">{fullDateLabel(now, locale)}</p>
          </div>
          <Link
            href="/profile"
            aria-label={t('navigation.profile')}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-base font-extrabold text-white"
          >
            {user.name.charAt(0).toUpperCase()}
          </Link>
        </header>

        <div className="mt-5 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-meta">{t('home.spentToday')}</p>
            <p className="tnum text-display-amount">
              <AnimatedAmount value={spentToday} currency={currency} />
            </p>
            {dailyGuide !== null ? (
              <p className="mt-1.5 text-sm font-medium text-text-secondary">
                {spentToday <= dailyGuide
                  ? t('home.guidanceUnder', {
                      amount: formatMoney(Math.round(dailyGuide - spentToday), { locale, currency }),
                      guide: formatMoney(Math.round(dailyGuide), { locale, currency, withSuffix: false }),
                    })
                  : t('home.guidanceOver', {
                      amount: formatMoney(Math.round(spentToday - dailyGuide), { locale, currency }),
                      guide: formatMoney(Math.round(dailyGuide), { locale, currency, withSuffix: false }),
                    })}
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-medium text-text-muted">{t('home.noGuidance')}</p>
            )}
          </div>
          {dailyGuide !== null && (
            <RingGauge value={guideFraction} label={t('home.spentToday')} className="shrink-0" />
          )}
        </div>
      </div>

      <div className="space-y-6 pt-6">
        {/* Monthly status — remaining-first, no bordered KPI grid */}
        <section aria-labelledby="month-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="month-heading" className="text-title-section">
              {t('home.thisMonth')}
            </h2>
            <span className="tnum text-meta">{t('home.daysLeft', { count: daysLeft })}</span>
          </div>
          {budget !== null ? (
            <>
              <p className="tnum mt-1 text-2xl font-display font-bold">
                <span className={remaining !== null && remaining < 0 ? 'text-danger' : 'text-text-primary'}>
                  {formatMoney(remaining ?? 0, { locale, currency })}
                </span>
                <span className="ms-1.5 text-sm font-medium text-text-muted">{t('home.remaining').toLowerCase()}</span>
              </p>
              <p className="text-sm text-text-muted">
                {formatMoney(monthSpent, { locale, currency })} {t('home.spent').toLowerCase()} · {formatMoney(budget, { locale, currency })}{' '}
                {t('home.budget').toLowerCase()}
              </p>
              <div className="mt-2.5">
                <ProgressBar value={monthSpent / budget} label={t('home.thisMonth')} />
              </div>
            </>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3.5 py-3">
              <p className="text-sm text-text-secondary">
                {formatMoney(monthSpent, { locale, currency })} {t('home.spent').toLowerCase()}
              </p>
              <Link href="/profile" className="shrink-0 text-sm font-bold text-info hover:underline">
                {t('home.setBudget')}
              </Link>
            </div>
          )}
        </section>

        {/* Primary CTA (mobile inline; FAB also exists in nav) */}
        <HomeAddButton />

        {/* Smart insight — tinted banner, not another white card */}
        {highlight && <InsightCard title={highlight.title} message={highlight.message} severity={insights[0].severity} />}

        {/* Recent transactions */}
        <section aria-labelledby="recent-heading">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="recent-heading" className="text-title-section">
              {t('home.recent')}
            </h2>
            <Link href="/transactions" className="flex items-center text-sm font-bold text-info hover:underline">
              {t('home.viewAll')}
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={t('transactions.noExpensesTitle')}
              message={t('home.emptyMessage')}
            />
          ) : (
            <div className="divide-y divide-border-subtle">
              {recent.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} href={`/transactions/${expense.id}`} />
              ))}
            </div>
          )}
        </section>

        {/* Category snapshot — a single ranked panel, not repeated identical boxes */}
        {topCategories.length > 0 && (
          <section aria-labelledby="categories-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="categories-heading" className="text-title-section">
                {t('home.topCategories')}
              </h2>
              <Link href="/insights" className="flex items-center text-sm font-bold text-info hover:underline">
                {t('insights.title')}
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
            <div className="rounded-lg bg-surface-sunken p-4">
              <CategoryBars data={topCategories} total={weekTotal} locale={locale} limit={3} />
            </div>
          </section>
        )}

        {budget === null && recent.length === 0 && (
          <EmptyState icon={Wallet} title={t('home.emptyTitle')} message={t('home.emptyMessage')} />
        )}
      </div>
    </div>
  )
}
