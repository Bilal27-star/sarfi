'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { CATEGORY_ICON_KEYS, CATEGORY_COLORS } from '@/config/categories'
import type { ActionErrorCode } from '@/i18n/action-error'
import type { ActionResult } from '@/server/services/expense-actions'

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = randomBytes(3).toString('hex')
  return `${base || 'category'}-${suffix}`
}

const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().refine((v) => CATEGORY_ICON_KEYS.includes(v)),
  color: z.string().refine((v) => Object.keys(CATEGORY_COLORS).includes(v)),
})

function revalidateCategoryPages() {
  revalidatePath('/', 'layout')
}

/** Own (userId = current user) categories only — system categories are
 * shared rows and can never be edited/deleted, only hidden/reordered. */
async function assertOwnCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({ where: { id: categoryId, userId } })
  if (!category) throw new Error('FORBIDDEN')
  return category
}

export type CreateCategoryResult =
  | { ok: true; category: { id: string; name: string; slug: string; icon: string; color: string; sortOrder: number } }
  | { ok: false; errorCode: ActionErrorCode }

export async function createCategory(input: unknown): Promise<CreateCategoryResult> {
  try {
    const user = await requireUser()
    const parsed = categoryInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { name, icon, color } = parsed.data

    const last = await db.category.findFirst({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const sortOrder = (last?.sortOrder ?? 0) + 1

    const created = await db.category.create({
      data: {
        userId: user.id,
        name,
        slug: slugify(name),
        icon,
        color,
        isSystem: false,
        sortOrder,
      },
    })
    revalidateCategoryPages()
    return { ok: true, category: { id: created.id, name: created.name, slug: created.slug, icon: created.icon, color: created.color, sortOrder } }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}

export async function updateCategory(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = categoryInputSchema.extend({ id: z.string().min(1) }).safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { id, name, icon, color } = parsed.data

    await assertOwnCategory(user.id, id)
    await db.category.update({ where: { id }, data: { name, icon, color } })
    revalidateCategoryPages()
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'category_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}

export type DeleteCategoryResult = { ok: true; archived: boolean } | { ok: false; errorCode: ActionErrorCode }

/** Custom categories only. A category still referenced by any expense,
 * budget, or recurring template is soft-archived instead of hard-deleted —
 * it disappears from pickers but history stays intact. Only a category with
 * zero references is actually removed. */
export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  try {
    const user = await requireUser()
    await assertOwnCategory(user.id, id)

    const [expenseCount, budgetCount, recurringCount] = await Promise.all([
      db.expense.count({ where: { categoryId: id } }),
      db.budget.count({ where: { categoryId: id } }),
      db.recurringExpense.count({ where: { categoryId: id } }),
    ])

    if (expenseCount > 0 || budgetCount > 0 || recurringCount > 0) {
      await db.category.update({ where: { id }, data: { isArchived: true } })
      revalidateCategoryPages()
      return { ok: true, archived: true }
    }

    await db.category.delete({ where: { id } })
    revalidateCategoryPages()
    return { ok: true, archived: false }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'category_forbidden' }
    return { ok: false, errorCode: 'delete_failed' }
  }
}

/** Hide/show a category for the current user only. Own categories toggle
 * their own isArchived flag; shared system categories get a per-user
 * UserCategoryPreference row so no other user is affected. */
export async function toggleCategoryVisibility(categoryId: string, hidden: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const category = await db.category.findFirst({
      where: { id: categoryId, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true, userId: true },
    })
    if (!category) return { ok: false, errorCode: 'not_found' }

    if (category.userId === user.id) {
      await db.category.update({ where: { id: categoryId }, data: { isArchived: hidden } })
    } else {
      await db.userCategoryPreference.upsert({
        where: { userId_categoryId: { userId: user.id, categoryId } },
        update: { hidden },
        create: { userId: user.id, categoryId, hidden },
      })
    }
    revalidateCategoryPages()
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'update_failed' }
  }
}

/** Persists a full top-level ordering in one transaction. Own categories
 * write straight to Category.sortOrder; shared ones get a per-user
 * preference row so reordering never affects other users. */
export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const categories = await db.category.findMany({
      where: { id: { in: orderedIds }, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true, userId: true },
    })
    const byId = new Map(categories.map((c) => [c.id, c]))

    const operations = orderedIds.flatMap((id, index) => {
      const category = byId.get(id)
      if (!category) return []
      return [
        category.userId === user.id
          ? db.category.update({ where: { id }, data: { sortOrder: index } })
          : db.userCategoryPreference.upsert({
              where: { userId_categoryId: { userId: user.id, categoryId: id } },
              update: { sortOrder: index },
              create: { userId: user.id, categoryId: id, sortOrder: index },
            }),
      ]
    })
    await db.$transaction(operations)
    revalidateCategoryPages()
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'update_failed' }
  }
}
