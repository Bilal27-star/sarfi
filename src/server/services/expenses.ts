import 'server-only'
import { db } from '@/server/db'
import { endOfDay, startOfDay, type DateRange } from '@/lib/dates'
import type { Prisma } from '@/generated/prisma/client'

/** Serializable expense shape for client components (Decimal -> string). */
export type ExpenseDTO = {
  id: string
  amount: string
  currency: string
  description: string
  merchant: string | null
  note: string | null
  expenseDate: string
  category: { id: string; name: string; slug: string; icon: string; color: string }
  wallet: { id: string; name: string; icon: string } | null
}

const expenseInclude = {
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  wallet: { select: { id: true, name: true, icon: true } },
} satisfies Prisma.ExpenseInclude

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>

export function toExpenseDTO(e: ExpenseWithRelations): ExpenseDTO {
  return {
    id: e.id,
    amount: e.amount.toString(),
    currency: e.currency,
    description: e.description,
    merchant: e.merchant,
    note: e.note,
    expenseDate: e.expenseDate.toISOString(),
    category: e.category,
    wallet: e.wallet,
  }
}

export async function getRecentExpenses(userId: string, take = 5): Promise<ExpenseDTO[]> {
  const rows = await db.expense.findMany({
    where: { userId },
    orderBy: { expenseDate: 'desc' },
    take,
    include: expenseInclude,
  })
  return rows.map(toExpenseDTO)
}

export type TransactionFilters = {
  categoryId?: string
  walletId?: string
  search?: string
  from?: Date
  to?: Date
  minAmount?: string
  maxAmount?: string
}

export async function getExpenses(userId: string, filters: TransactionFilters = {}, take = 200) {
  const where: Prisma.ExpenseWhereInput = { userId }
  if (filters.categoryId) {
    // include subcategories of a parent category
    const children = await db.category.findMany({
      where: { parentId: filters.categoryId },
      select: { id: true },
    })
    where.categoryId = { in: [filters.categoryId, ...children.map((c) => c.id)] }
  }
  if (filters.walletId) where.walletId = filters.walletId
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { merchant: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.from || filters.to) {
    where.expenseDate = {
      ...(filters.from ? { gte: startOfDay(filters.from) } : {}),
      ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
    }
  }
  if (filters.minAmount) where.amount = { gte: filters.minAmount }
  if (filters.maxAmount) {
    where.amount = { ...(where.amount as object), lte: filters.maxAmount }
  }
  const rows = await db.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
    take,
    include: expenseInclude,
  })
  return rows.map(toExpenseDTO)
}

export async function getExpenseById(userId: string, id: string): Promise<ExpenseDTO | null> {
  const row = await db.expense.findFirst({ where: { id, userId }, include: expenseInclude })
  return row ? toExpenseDTO(row) : null
}

export async function sumExpenses(userId: string, range: DateRange): Promise<number> {
  const result = await db.expense.aggregate({
    where: { userId, expenseDate: { gte: range.start, lte: range.end } },
    _sum: { amount: true },
  })
  return Number(result._sum.amount ?? 0)
}

export type CategoryTotal = {
  categoryId: string
  name: string
  slug: string
  icon: string
  color: string
  total: number
  count: number
}

/** Totals per top-level category (subcategory spend rolls up to the parent). */
export async function categoryTotals(userId: string, range: DateRange): Promise<CategoryTotal[]> {
  const rows = await db.expense.findMany({
    where: { userId, expenseDate: { gte: range.start, lte: range.end } },
    select: {
      amount: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          color: true,
          parent: { select: { id: true, name: true, slug: true, icon: true, color: true } },
        },
      },
    },
  })
  const map = new Map<string, CategoryTotal>()
  for (const row of rows) {
    const top = row.category.parent ?? row.category
    const entry = map.get(top.id) ?? {
      categoryId: top.id,
      name: top.name,
      slug: top.slug,
      icon: top.icon,
      color: top.color,
      total: 0,
      count: 0,
    }
    entry.total += Number(row.amount)
    entry.count += 1
    map.set(top.id, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export type DailyTotal = { date: string; total: number }

export async function dailyTotals(userId: string, range: DateRange): Promise<DailyTotal[]> {
  const rows = await db.expense.findMany({
    where: { userId, expenseDate: { gte: range.start, lte: range.end } },
    select: { amount: true, expenseDate: true },
  })
  const map = new Map<string, number>()
  // Pre-fill every day so charts show gaps honestly
  for (let d = new Date(range.start); d <= range.end; d.setDate(d.getDate() + 1)) {
    map.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of rows) {
    const key = row.expenseDate.toISOString().slice(0, 10)
    map.set(key, (map.get(key) ?? 0) + Number(row.amount))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }))
}

/** Categories available for picking (Add Expense, filters, detail view) —
 * excludes anything the user has hidden via UserCategoryPreference and
 * respects their effective per-user ordering. See categories.ts for the
 * fuller management-screen query (which also surfaces hidden ones). */
export async function getSystemAndUserCategories(userId: string) {
  const rows = await db.category.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      isArchived: false,
      parentId: null,
    },
    include: {
      children: { where: { isArchived: false }, orderBy: { sortOrder: 'asc' } },
      userPrefs: { where: { userId } },
    },
  })
  return rows
    .filter((c) => c.userId === userId || !c.userPrefs[0]?.hidden)
    .map((c) => ({ ...c, sortOrder: c.userId === userId ? c.sortOrder : (c.userPrefs[0]?.sortOrder ?? c.sortOrder) }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getWallets(userId: string) {
  return db.wallet.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, type: true, icon: true, color: true },
  })
}

export async function getOverallBudget(userId: string): Promise<number | null> {
  const budget = await db.budget.findFirst({
    where: { userId, categoryId: null, periodType: 'MONTHLY' },
  })
  return budget ? Number(budget.amount) : null
}
