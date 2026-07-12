'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { moneyString } from '@/lib/validation/expense'
import type { ActionResult } from '@/server/services/expense-actions'
import type { ActionErrorCode } from '@/i18n/action-error'

const recurringInputSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: moneyString,
  categoryId: z.string().min(1),
  walletId: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  nextDueDate: z.iso.date(),
})

function revalidateRecurringPages() {
  revalidatePath('/', 'layout')
}

async function assertOwnCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({ where: { id: categoryId, OR: [{ userId: null }, { userId }] }, select: { id: true } })
  if (!category) throw new Error('INVALID_CATEGORY')
}

async function assertOwnWallet(userId: string, walletId: string) {
  const wallet = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } })
  if (!wallet) throw new Error('INVALID_WALLET')
}

async function assertOwnRecurring(userId: string, id: string) {
  const recurring = await db.recurringExpense.findFirst({ where: { id, userId } })
  if (!recurring) throw new Error('FORBIDDEN')
  return recurring
}

export type RecurringSaveResult =
  | {
      ok: true
      recurring: {
        id: string
        description: string
        amount: string
        currency: string
        categoryId: string
        walletId: string | null
        frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
        nextDueDate: string
        isActive: boolean
      }
    }
  | { ok: false; errorCode: ActionErrorCode }

export async function createRecurring(input: unknown): Promise<RecurringSaveResult> {
  try {
    const user = await requireUser()
    const parsed = recurringInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { description, amount, categoryId, walletId, frequency, nextDueDate } = parsed.data

    await assertOwnCategory(user.id, categoryId)
    if (walletId) await assertOwnWallet(user.id, walletId)

    const created = await db.recurringExpense.create({
      data: {
        userId: user.id,
        description,
        amount,
        currency: user.preferredCurrency,
        categoryId,
        walletId: walletId || null,
        frequency,
        nextDueDate: new Date(nextDueDate),
      },
    })
    revalidateRecurringPages()
    return {
      ok: true,
      recurring: {
        id: created.id,
        description: created.description,
        amount: created.amount.toString(),
        currency: created.currency,
        categoryId: created.categoryId,
        walletId: created.walletId,
        frequency: created.frequency,
        nextDueDate: created.nextDueDate.toISOString(),
        isActive: created.isActive,
      },
    }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}

export async function updateRecurring(input: unknown): Promise<RecurringSaveResult> {
  try {
    const user = await requireUser()
    const parsed = recurringInputSchema.extend({ id: z.string().min(1) }).safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { id, description, amount, categoryId, walletId, frequency, nextDueDate } = parsed.data

    await assertOwnRecurring(user.id, id)
    await assertOwnCategory(user.id, categoryId)
    if (walletId) await assertOwnWallet(user.id, walletId)

    const updated = await db.recurringExpense.update({
      where: { id },
      data: { description, amount, categoryId, walletId: walletId || null, frequency, nextDueDate: new Date(nextDueDate) },
    })
    revalidateRecurringPages()
    return {
      ok: true,
      recurring: {
        id: updated.id,
        description: updated.description,
        amount: updated.amount.toString(),
        currency: updated.currency,
        categoryId: updated.categoryId,
        walletId: updated.walletId,
        frequency: updated.frequency,
        nextDueDate: updated.nextDueDate.toISOString(),
        isActive: updated.isActive,
      },
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'recurring_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}

/** No delete protection needed — a materialized expense is an independent
 * row with no back-reference to the template that created it (same as a
 * real-world recurring payment stamping out separate transactions), so
 * removing the template can never orphan anything. */
export async function deleteRecurring(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await assertOwnRecurring(user.id, id)
    await db.recurringExpense.delete({ where: { id } })
    revalidateRecurringPages()
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'recurring_forbidden' }
    return { ok: false, errorCode: 'delete_failed' }
  }
}

export async function toggleRecurringActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await assertOwnRecurring(user.id, id)
    await db.recurringExpense.update({ where: { id }, data: { isActive } })
    revalidateRecurringPages()
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'recurring_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}
