import { describe, expect, it } from 'vitest'
import { generateSpendingInsights, type ExpensePoint } from '@/server/services/insights'

function day(offset: number, hour = 12): Date {
  const d = new Date(2026, 5, 20 + offset, hour)
  return d
}

function point(amount: number, dateOffset: number, slug = 'food', merchant?: string): ExpensePoint {
  return { amount, date: day(dateOffset), categorySlug: slug, categoryName: 'Food', merchant }
}

describe('generateSpendingInsights', () => {
  it('flags a category increase >= 20%', () => {
    const insights = generateSpendingInsights({
      expenses: [point(3000, 0), point(3000, 1)],
      previousExpenses: [point(2000, -7), point(2000, -6)],
      currentCategories: [{ name: 'Food', slug: 'food', total: 6000, count: 2 }],
      previousCategories: [{ name: 'Food', slug: 'food', total: 4000, count: 2 }],
    })
    const increase = insights.find((i) => i.type === 'category-increase')
    expect(increase).toBeDefined()
    expect(increase!.severity).toBe('warning')
    expect(increase!.params.percent).toBe(50)
    expect(increase!.params.categorySlug).toBe('food')
  })

  it('celebrates a category decrease', () => {
    const insights = generateSpendingInsights({
      expenses: [point(1000, 0)],
      previousExpenses: [point(2000, -7)],
      currentCategories: [{ name: 'Motorcycle', slug: 'motorcycle', total: 1000, count: 1 }],
      previousCategories: [{ name: 'Motorcycle', slug: 'motorcycle', total: 2000, count: 1 }],
    })
    expect(insights.some((i) => i.type === 'category-decrease' && i.severity === 'positive')).toBe(true)
  })

  it('projects monthly overspend at current pace', () => {
    const insights = generateSpendingInsights({
      expenses: [],
      previousExpenses: [],
      currentCategories: [],
      previousCategories: [],
      budget: 60000,
      daysElapsedInMonth: 10,
      daysInMonth: 30,
      monthSpent: 40000, // pace: 120k month vs 60k budget
    })
    const projection = insights.find((i) => i.type === 'budget-projection-over')
    expect(projection).toBeDefined()
    expect(projection!.severity).toBe('warning')
  })

  it('reports being on track under budget', () => {
    const insights = generateSpendingInsights({
      expenses: [],
      previousExpenses: [],
      currentCategories: [],
      previousCategories: [],
      budget: 60000,
      daysElapsedInMonth: 15,
      daysInMonth: 30,
      monthSpent: 20000,
    })
    const projection = insights.find((i) => i.type === 'budget-projection-under')
    expect(projection?.severity).toBe('positive')
  })

  it('detects repeated merchant spending', () => {
    const expenses = [0, 0, 1, 2, 3].map((offset) => point(150, offset, 'food-coffee', 'Café El Bahdja'))
    const insights = generateSpendingInsights({
      expenses,
      previousExpenses: [],
      currentCategories: [{ name: 'Food', slug: 'food', total: 750, count: 5 }],
      previousCategories: [],
    })
    expect(insights.some((i) => i.type === 'merchant-repeat' && i.params.merchant === 'Café El Bahdja')).toBe(true)
  })

  it('falls back to top-category when little else to say', () => {
    const insights = generateSpendingInsights({
      expenses: [point(500, 0)],
      previousExpenses: [],
      currentCategories: [{ name: 'Food', slug: 'food', total: 500, count: 1 }],
      previousCategories: [],
    })
    expect(insights.some((i) => i.type === 'top-category')).toBe(true)
  })

  it('returns at most 5 insights, warnings first', () => {
    const expenses: ExpensePoint[] = []
    for (let d = 0; d < 15; d++) {
      expenses.push(point(100, d, 'food-coffee', 'Café X'))
      expenses.push(point(d === 4 ? 9000 : 400, d, 'food'))
    }
    const insights = generateSpendingInsights({
      expenses,
      previousExpenses: [point(100, -10)],
      currentCategories: [{ name: 'Food', slug: 'food', total: 8000, count: 30 }],
      previousCategories: [{ name: 'Food', slug: 'food', total: 1000, count: 2 }],
      budget: 10000,
      daysElapsedInMonth: 15,
      daysInMonth: 30,
      monthSpent: 9000,
    })
    expect(insights.length).toBeLessThanOrEqual(5)
    const firstWarning = insights.findIndex((i) => i.severity === 'warning')
    const firstNeutral = insights.findIndex((i) => i.severity === 'neutral')
    if (firstWarning !== -1 && firstNeutral !== -1) expect(firstWarning).toBeLessThan(firstNeutral)
  })
})
