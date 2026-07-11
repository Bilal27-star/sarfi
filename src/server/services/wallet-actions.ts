'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { CATEGORY_ICON_KEYS, CATEGORY_COLORS } from '@/config/categories'
import type { ActionErrorCode } from '@/i18n/action-error'
import type { ActionResult } from '@/server/services/expense-actions'

const walletInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.enum(['CASH', 'CARD', 'BANK', 'OTHER']),
  icon: z.string().refine((v) => CATEGORY_ICON_KEYS.includes(v)),
  color: z.string().refine((v) => Object.keys(CATEGORY_COLORS).includes(v)),
})

function revalidateWalletPages() {
  revalidatePath('/', 'layout')
}

async function assertOwnWallet(userId: string, walletId: string) {
  const wallet = await db.wallet.findFirst({ where: { id: walletId, userId } })
  if (!wallet) throw new Error('FORBIDDEN')
  return wallet
}

export type CreateWalletResult =
  | { ok: true; wallet: { id: string; name: string; type: 'CASH' | 'CARD' | 'BANK' | 'OTHER'; icon: string; color: string; sortOrder: number } }
  | { ok: false; errorCode: ActionErrorCode }

export async function createWallet(input: unknown): Promise<CreateWalletResult> {
  try {
    const user = await requireUser()
    const parsed = walletInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { name, type, icon, color } = parsed.data

    const last = await db.wallet.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const sortOrder = (last?.sortOrder ?? -1) + 1

    const created = await db.wallet.create({
      data: { userId: user.id, name, type, icon, color, currency: user.preferredCurrency, sortOrder },
    })
    revalidateWalletPages()
    return { ok: true, wallet: { id: created.id, name: created.name, type: created.type, icon: created.icon, color: created.color, sortOrder } }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}

export async function updateWallet(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = walletInputSchema.extend({ id: z.string().min(1) }).safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { id, name, type, icon, color } = parsed.data

    await assertOwnWallet(user.id, id)
    await db.wallet.update({ where: { id }, data: { name, type, icon, color } })
    revalidateWalletPages()
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'wallet_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}

export type DeleteWalletResult = { ok: true; archived: boolean } | { ok: false; errorCode: ActionErrorCode }

/** A wallet still referenced by any expense or recurring template is
 * soft-archived instead of hard-deleted, so historical transactions keep
 * their wallet tag rather than silently losing it (even though the schema
 * would allow a direct delete via onDelete: SetNull). Only a wallet with
 * zero references is actually removed. */
export async function deleteWallet(id: string): Promise<DeleteWalletResult> {
  try {
    const user = await requireUser()
    await assertOwnWallet(user.id, id)

    const [expenseCount, recurringCount] = await Promise.all([
      db.expense.count({ where: { walletId: id } }),
      db.recurringExpense.count({ where: { walletId: id } }),
    ])

    if (expenseCount > 0 || recurringCount > 0) {
      await db.wallet.update({ where: { id }, data: { isArchived: true } })
      revalidateWalletPages()
      return { ok: true, archived: true }
    }

    await db.wallet.delete({ where: { id } })
    revalidateWalletPages()
    return { ok: true, archived: false }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'wallet_forbidden' }
    return { ok: false, errorCode: 'delete_failed' }
  }
}

/** Brings a soft-archived wallet (see deleteWallet) back into the active list. */
export async function restoreWallet(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await assertOwnWallet(user.id, id)
    await db.wallet.update({ where: { id }, data: { isArchived: false } })
    revalidateWalletPages()
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') return { ok: false, errorCode: 'wallet_forbidden' }
    return { ok: false, errorCode: 'update_failed' }
  }
}

export async function reorderWallets(orderedIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const wallets = await db.wallet.findMany({
      where: { id: { in: orderedIds }, userId: user.id },
      select: { id: true },
    })
    const ownedIds = new Set(wallets.map((w) => w.id))

    const operations = orderedIds.flatMap((id, index) =>
      ownedIds.has(id) ? [db.wallet.update({ where: { id }, data: { sortOrder: index } })] : [],
    )
    await db.$transaction(operations)
    revalidateWalletPages()
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'update_failed' }
  }
}
