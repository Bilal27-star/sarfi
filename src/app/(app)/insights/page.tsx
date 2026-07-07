import type { Metadata } from 'next'
import { ChartPie, TrendingDown, TrendingUp } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { categoryTotals, dailyTotals, getOverallBudget, sumExpenses } from '@/server/services/expenses'
import { generateSpendingInsights } from '@/server/services/insights'
import { db } from '@/server/db'
import { financialMonthRange, periodRange, previousRange, type PeriodKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { EmptyState } from '@/components/ui/empty-state'
import { InsightCard } from '@/components/insights/insight-card'
import { CategoryBars, TrendArea } from '@/components/insights/charts'
import { getServerTranslator } from '@/i18n/locale-server'
import { categoryLabel } from '@/i18n/category-label'
import { localizeInsight } from '@/i18n/localize-insight'
import { cn } from '@/lib/utils'
import { PeriodSwitcher } from './period-switcher'

export const metadata: Metadata = { title: 'Insights' }

const PERIOD_KEYS: PeriodKey[] = ['7d', '30d', '3m', '1y']

export default async function InsightsPage(props: { searchParams: Promise<{ period?: string }> }) {
  const user = (await getCurrentUser())!
  const { locale, t } = await getServerTranslator()
  const currency = user.preferredCurrency
  const params = await props.searchParams
  const period: PeriodKey = (PERIOD_KEYS.find((k) => k === params.period) ?? '30d') as PeriodKey
  const now = new Date()
  const range = periodRange(period, now)
  const prevRange = previousRange(range)
  const monthRange = financialMonthRange(now, user.preferences?.financialMonthStartDay ?? 1)

  const [total, prevTotal, categories, prevCategories, daily, budget, monthSpent, expenses, prevExpenses] =
    await Promise.all([
      sumExpenses(user.id, range),
      sumExpenses(user.id, prevRange),
      categoryTotals(user.id, range),
      categoryTotals(user.id, prevRange),
      dailyTotals(user.id, range),
      getOverallBudget(user.id),
      sumExpenses(user.id, monthRange),
      db.expense.findMany({
        where: { userId: user.id, expenseDate: { gte: range.start, lte: range.end } },
        select: { amount: true, expenseDate: true, merchant: true, category: { select: { slug: true, name: true } } },
      }),
      db.expense.findMany({
        where: { userId: user.id, expenseDate: { gte: prevRange.start, lte: prevRange.end } },
        select: { amount: true, expenseDate: true, merchant: true, category: { select: { slug: true, name: true } } },
      }),
    ])

  const trackedDays = daily.filter((d) => d.total > 0).length
  const dailyAverage = trackedDays > 0 ? total / trackedDays : 0
  const highestDay = daily.reduce((max, d) => (d.total > max.total ? d : max), { date: '', total: 0 })
  const topCategory = categories[0]
  const change = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null

  const daysInMonth = Math.round((monthRange.end.getTime() - monthRange.start.getTime()) / 86_400_000)
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - monthRange.start.getTime()) / 86_400_000))

  const insights = generateSpendingInsights({
    expenses: expenses.map((e) => ({
      amount: Number(e.amount),
      date: e.expenseDate,
      categorySlug: e.category.slug,
      categoryName: e.category.name,
      merchant: e.merchant,
    })),
    previousExpenses: prevExpenses.map((e) => ({
      amount: Number(e.amount),
      date: e.expenseDate,
      categorySlug: e.category.slug,
      categoryName: e.category.name,
      merchant: e.merchant,
    })),
    currentCategories: categories.map((c) => ({ name: c.name, slug: c.slug, total: c.total, count: c.count })),
    previousCategories: prevCategories.map((c) => ({ name: c.name, slug: c.slug, total: c.total, count: c.count })),
    budget,
    daysElapsedInMonth: daysElapsed,
    daysInMonth,
    monthSpent,
  })

  // Downsample the trend for long periods so the line stays readable on phones
  const trendData =
    daily.length > 60
      ? daily.filter((_, i) => i % Math.ceil(daily.length / 60) === 0 || i === daily.length - 1)
      : daily

  const periods = PERIOD_KEYS.map((key) => ({ key, label: t(`insights.periods.${key}`) }))
  const topCategoriesRanked = categories.map((c) => ({ ...c, label: categoryLabel(t, c) }))

  return (
    <div className="space-y-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title-screen">{t('insights.title')}</h1>
        <PeriodSwitcher periods={periods} active={period} />
      </div>

      {total === 0 ? (
        <EmptyState icon={ChartPie} title={t('insights.notEnoughDataTitle')} message={t('insights.notEnoughDataMessage')} />
      ) : (
        <>
          {/* Headline — open, no dark card; the number itself is the focal point */}
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-meta">
                  {t('insights.totalSpent')} · {periods.find((p) => p.key === period)!.label}
                </p>
                <p className="tnum text-display-amount">{formatMoney(total, { locale, currency })}</p>
              </div>
              {change !== null && (
                <p
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold',
                    change > 0 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
                  )}
                >
                  {change > 0 ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
                  {change > 0 ? '+' : ''}
                  {change}%
                </p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4">
              <div>
                <p className="tnum text-title-card">{formatMoney(Math.round(dailyAverage), { locale, currency, withSuffix: false })}</p>
                <p className="text-caption text-text-muted">{t('insights.dailyAverage')}</p>
              </div>
              <div>
                <p className="tnum text-title-card">
                  {highestDay.total > 0 ? formatMoney(Math.round(highestDay.total), { locale, currency, withSuffix: false }) : '—'}
                </p>
                <p className="text-caption text-text-muted">{t('insights.peak')}</p>
              </div>
              <div>
                <p className="truncate text-title-card">{topCategory ? categoryLabel(t, topCategory) : '—'}</p>
                <p className="text-caption text-text-muted">{t('insights.topCategory')}</p>
              </div>
            </div>
          </section>

          {/* Trend */}
          <section>
            <h2 className="mb-3 text-title-section">{t('insights.spendingTrend')}</h2>
            <TrendArea data={trendData} locale={locale} ariaLabel={t('insights.spendingTrend')} peakLabel={t('insights.peak')} />
          </section>

          {/* What the data says — varied tinted insight modules, not repeated white cards */}
          {insights.length > 0 && (
            <section aria-labelledby="insights-heading" className="space-y-2.5">
              <h2 id="insights-heading" className="text-title-section">
                {t('insights.whatDataSays')}
              </h2>
              {insights.map((insight, i) => {
                const localized = localizeInsight(insight, t, locale, currency)
                return (
                  <InsightCard
                    key={`${insight.type}-${i}`}
                    title={localized.title}
                    message={localized.message}
                    severity={insight.severity}
                  />
                )
              })}
            </section>
          )}

          {/* Category distribution — one ranked view, not a redundant donut + list pair */}
          <section>
            <h2 className="mb-4 text-title-section">{t('insights.whereMoneyWent')}</h2>
            <CategoryBars data={topCategoriesRanked} total={total} locale={locale} limit={8} />
          </section>
        </>
      )}
    </div>
  )
}
