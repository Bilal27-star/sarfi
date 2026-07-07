'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { createExpenseSchema, updateExpenseSchema } from '@/lib/validation/expense'
import type { ActionErrorCode } from '@/i18n/action-error'

export type ActionResult = { ok: true } | { ok: false; errorCode: ActionErrorCode }

function revalidateAppPages() {
  revalidatePath('/home')
  revalidatePath('/transactions')
  revalidatePath('/insights')
}

async function assertOwnedCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  })
  if (!category) throw new Error('Invalid category')
}

async function assertOwnedWallet(userId: string, walletId: string) {
  const wallet = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } })
  if (!wallet) throw new Error('Invalid wallet')
}

export async function createExpense(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = createExpenseSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const data = parsed.data

    await assertOwnedCategory(user.id, data.categoryId)
    if (data.walletId) await assertOwnedWallet(user.id, data.walletId)

    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date()
    await db.expense.create({
      data: {
        userId: user.id,
        categoryId: data.categoryId,
        walletId: data.walletId || null,
        amount: data.amount,
        currency: user.preferredCurrency,
        description: data.description,
        merchant: data.merchant || null,
        note: data.note || null,
        expenseDate,
      },
    })

    // Streak tracking
    const day = new Date(expenseDate)
    day.setHours(0, 0, 0, 0)
    await db.dailyTracking.upsert({
      where: { userId_date: { userId: user.id, date: day } },
      update: { expenseCount: { increment: 1 }, trackingCompleted: true },
      create: { userId: user.id, date: day, expenseCount: 1, trackingCompleted: true },
    })

    revalidateAppPages()
    return { ok: true }
  } catch (e) {
    console.error('createExpense failed')
    return { ok: false, errorCode: e instanceof Error && e.message === 'UNAUTHENTICATED' ? 'unauthenticated' : 'save_failed' }
  }
}

export async function updateExpense(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = updateExpenseSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { id, ...data } = parsed.data

    const existing = await db.expense.findFirst({ where: { id, userId: user.id } })
    if (!existing) return { ok: false, errorCode: 'not_found' }
    if (data.categoryId) await assertOwnedCategory(user.id, data.categoryId)
    if (data.walletId) await assertOwnedWallet(user.id, data.walletId)

    await db.expense.update({
      where: { id },
      data: {
        ...(data.amount ? { amount: data.amount } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.walletId !== undefined ? { walletId: data.walletId || null } : {}),
        ...(data.merchant !== undefined ? { merchant: data.merchant || null } : {}),
        ...(data.note !== undefined ? { note: data.note || null } : {}),
        ...(data.expenseDate ? { expenseDate: new Date(data.expenseDate) } : {}),
      },
    })
    revalidateAppPages()
    revalidatePath(`/transactions/${id}`)
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'update_failed' }
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const deleted = await db.expense.deleteMany({ where: { id, userId: user.id } })
    if (deleted.count === 0) return { ok: false, errorCode: 'not_found' }
    revalidateAppPages()
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'delete_failed' }
  }
}

export async function duplicateExpense(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const existing = await db.expense.findFirst({ where: { id, userId: user.id } })
    if (!existing) return { ok: false, errorCode: 'not_found' }
    await db.expense.create({
      data: {
        userId: user.id,
        categoryId: existing.categoryId,
        walletId: existing.walletId,
        amount: existing.amount,
        currency: existing.currency,
        description: existing.description,
        merchant: existing.merchant,
        note: existing.note,
        expenseDate: new Date(),
      },
    })
    revalidateAppPages()
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'duplicate_failed' }
  }
}

export async function deleteExpenseAndGo(id: string): Promise<void> {
  const result = await deleteExpense(id)
  if (result.ok) redirect('/transactions')
}
