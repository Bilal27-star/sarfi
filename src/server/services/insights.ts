/**
 * Deterministic spending-insights engine.
 * Pure functions over pre-aggregated data — no AI APIs, fully testable.
 *
 * Output is locale-agnostic: every insight carries a `type` plus numeric/slug
 * `params`. Localizing to a title/message string happens at render time via
 * `localizeInsight` (src/i18n/localize-insight.ts), so this module never
 * hardcodes English text.
 */

export type InsightSeverity = 'positive' | 'neutral' | 'warning'

export type InsightType =
  | 'category-increase'
  | 'category-decrease'
  | 'high-spending-day'
  | 'top-category'
  | 'expensive-weekday'
  | 'budget-projection-over'
  | 'budget-projection-under'
  | 'daily-average-up'
  | 'daily-average-down'
  | 'merchant-repeat'
  | 'small-purchases'

export type InsightParams = {
  categorySlug?: string
  categoryName?: string
  percent?: number
  amount?: number
  comparison?: number
  weekdayIndex?: number
  dateIso?: string
  merchant?: string
  count?: number
  threshold?: number
}

export type Insight = {
  type: InsightType
  severity: InsightSeverity
  params: InsightParams
}

export type CategoryAgg = { name: string; slug: string; total: number; count: number }
export type ExpensePoint = {
  amount: number
  date: Date
  categorySlug: string
  categoryName: string
  merchant?: string | null
}

export type InsightsInput = {
  expenses: ExpensePoint[] // current period
  previousExpenses: ExpensePoint[] // same-length previous period
  currentCategories: CategoryAgg[]
  previousCategories: CategoryAgg[]
  budget?: number | null // monthly budget
  daysElapsedInMonth?: number
  daysInMonth?: number
  monthSpent?: number
}

function pct(current: number, previous: number): number {
  if (previous <= 0) return 100
  return Math.round(((current - previous) / previous) * 100)
}

export function generateSpendingInsights(input: InsightsInput): Insight[] {
  const insights: Insight[] = []
  const {
    expenses,
    previousExpenses,
    currentCategories,
    previousCategories,
    budget,
    daysElapsedInMonth,
    daysInMonth,
    monthSpent,
  } = input

  const prevBySlug = new Map(previousCategories.map((c) => [c.slug, c]))

  // Category increases / decreases vs previous period (min spend to matter)
  for (const cat of currentCategories.slice(0, 6)) {
    const prev = prevBySlug.get(cat.slug)
    if (!prev || prev.total < 500 || cat.total < 500) continue
    const change = pct(cat.total, prev.total)
    if (change >= 20) {
      insights.push({
        type: 'category-increase',
        severity: 'warning',
        params: { categorySlug: cat.slug, categoryName: cat.name, percent: change, amount: cat.total, comparison: prev.total },
      })
    } else if (change <= -20) {
      insights.push({
        type: 'category-decrease',
        severity: 'positive',
        params: { categorySlug: cat.slug, categoryName: cat.name, percent: Math.abs(change), amount: cat.total, comparison: prev.total },
      })
    }
  }

  // Budget projection
  if (budget && daysElapsedInMonth && daysInMonth && monthSpent !== undefined && daysElapsedInMonth >= 5) {
    const projected = (monthSpent / daysElapsedInMonth) * daysInMonth
    if (projected > budget * 1.05) {
      insights.push({
        type: 'budget-projection-over',
        severity: 'warning',
        params: { percent: Math.round(((projected - budget) / budget) * 100), amount: Math.round(projected), comparison: budget },
      })
    } else if (projected < budget * 0.9) {
      insights.push({
        type: 'budget-projection-under',
        severity: 'positive',
        params: { percent: Math.round(((budget - projected) / budget) * 100), amount: Math.round(projected), comparison: budget },
      })
    }
  }

  // Daily average change
  const dayCount = (list: ExpensePoint[]) => new Set(list.map((e) => e.date.toDateString())).size || 1
  const currentAvg = expenses.reduce((s, e) => s + e.amount, 0) / dayCount(expenses)
  const previousAvg = previousExpenses.reduce((s, e) => s + e.amount, 0) / dayCount(previousExpenses)
  if (previousAvg > 0 && expenses.length >= 5) {
    const change = pct(currentAvg, previousAvg)
    if (Math.abs(change) >= 15) {
      insights.push({
        type: change > 0 ? 'daily-average-up' : 'daily-average-down',
        severity: change > 0 ? 'warning' : 'positive',
        params: { percent: Math.abs(change), amount: Math.round(currentAvg), comparison: Math.round(previousAvg) },
      })
    }
  }

  // Most expensive weekday (needs at least 2 weeks of signal)
  if (expenses.length >= 14) {
    const byWeekday = new Array(7).fill(0)
    const weekdayOccurrences = new Array(7).fill(0)
    const seenDays = new Set<string>()
    for (const e of expenses) {
      byWeekday[e.date.getDay()] += e.amount
      const key = e.date.toDateString()
      if (!seenDays.has(key)) {
        seenDays.add(key)
        weekdayOccurrences[e.date.getDay()] += 1
      }
    }
    const avgByWeekday = byWeekday.map((total, i) => (weekdayOccurrences[i] ? total / weekdayOccurrences[i] : 0))
    const max = Math.max(...avgByWeekday)
    const overall = avgByWeekday.reduce((a, b) => a + b, 0) / avgByWeekday.filter(Boolean).length
    const idx = avgByWeekday.indexOf(max)
    if (max > overall * 1.4) {
      insights.push({
        type: 'expensive-weekday',
        severity: 'neutral',
        params: { weekdayIndex: idx, amount: Math.round(max) },
      })
    }
  }

  // Unusually high spending day within the period
  if (expenses.length >= 7) {
    const byDay = new Map<string, number>()
    const isoByDay = new Map<string, string>()
    for (const e of expenses) {
      const key = e.date.toDateString()
      byDay.set(key, (byDay.get(key) ?? 0) + e.amount)
      isoByDay.set(key, e.date.toISOString())
    }
    const totals = [...byDay.values()]
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const [maxDay, maxTotal] = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]
    if (maxTotal > avg * 2.2) {
      insights.push({
        type: 'high-spending-day',
        severity: 'neutral',
        params: { dateIso: isoByDay.get(maxDay), amount: Math.round(maxTotal), comparison: Math.round(avg) },
      })
    }
  }

  // Repeated merchant
  const merchantTotals = new Map<string, { total: number; count: number }>()
  for (const e of expenses) {
    if (!e.merchant) continue
    const entry = merchantTotals.get(e.merchant) ?? { total: 0, count: 0 }
    entry.total += e.amount
    entry.count += 1
    merchantTotals.set(e.merchant, entry)
  }
  const topMerchant = [...merchantTotals.entries()].sort((a, b) => b[1].total - a[1].total)[0]
  if (topMerchant && topMerchant[1].count >= 5) {
    insights.push({
      type: 'merchant-repeat',
      severity: 'neutral',
      params: { merchant: topMerchant[0], count: topMerchant[1].count, amount: Math.round(topMerchant[1].total) },
    })
  }

  // Small purchases accumulating
  const small = expenses.filter((e) => e.amount <= 200)
  const smallTotal = small.reduce((s, e) => s + e.amount, 0)
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)
  if (small.length >= 10 && grandTotal > 0 && smallTotal / grandTotal >= 0.15) {
    insights.push({
      type: 'small-purchases',
      severity: 'neutral',
      params: {
        count: small.length,
        amount: Math.round(smallTotal),
        threshold: 200,
        percent: Math.round((smallTotal / grandTotal) * 100),
      },
    })
  }

  // Top category (fallback so the list is never empty when data exists)
  if (currentCategories.length > 0 && insights.length < 4) {
    const top = currentCategories[0]
    insights.push({
      type: 'top-category',
      severity: 'neutral',
      params: { categorySlug: top.slug, categoryName: top.name, amount: top.total, count: top.count },
    })
  }

  const severityOrder: InsightSeverity[] = ['warning', 'positive', 'neutral']
  return insights.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)).slice(0, 5)
}
