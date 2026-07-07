import type { Insight, InsightType } from '@/server/services/insights'
import type { Translator } from '@/i18n/translator'
import type { Locale } from '@/i18n/config'
import { formatMoney } from '@/lib/money'
import { weekdayLabel, dayLabel } from '@/lib/dates'
import { categoryLabel } from '@/i18n/category-label'

const TYPE_KEY: Record<InsightType, string> = {
  'category-increase': 'categoryIncrease',
  'category-decrease': 'categoryDecrease',
  'budget-projection-over': 'budgetProjectionOver',
  'budget-projection-under': 'budgetProjectionUnder',
  'daily-average-up': 'dailyAverageUp',
  'daily-average-down': 'dailyAverageDown',
  'expensive-weekday': 'expensiveWeekday',
  'high-spending-day': 'highSpendingDay',
  'merchant-repeat': 'merchantRepeat',
  'small-purchases': 'smallPurchases',
  'top-category': 'topCategory',
}

export function localizeInsight(
  insight: Insight,
  t: Translator,
  locale: Locale,
  currency: string,
): { title: string; message: string } {
  const p = insight.params
  const params: Record<string, string | number> = {}
  if (p.categorySlug) params.category = categoryLabel(t, { slug: p.categorySlug, name: p.categoryName ?? p.categorySlug })
  if (p.percent !== undefined) params.percent = p.percent
  if (p.amount !== undefined) params.amount = formatMoney(p.amount, { currency, locale })
  if (p.comparison !== undefined) params.comparison = formatMoney(p.comparison, { currency, locale })
  if (p.threshold !== undefined) params.threshold = formatMoney(p.threshold, { currency, locale })
  if (p.count !== undefined) params.count = p.count
  if (p.merchant) params.merchant = p.merchant
  if (p.weekdayIndex !== undefined) params.weekday = weekdayLabel(p.weekdayIndex, locale)
  if (p.dateIso) params.date = dayLabel(new Date(p.dateIso), locale, t)

  const key = TYPE_KEY[insight.type]
  return {
    title: t(`insights.types.${key}.title`, params),
    message: t(`insights.types.${key}.message`, params),
  }
}
