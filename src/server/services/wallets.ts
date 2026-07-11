import { db } from '@/server/db'

export type ManagedWallet = {
  id: string
  name: string
  type: 'CASH' | 'CARD' | 'BANK' | 'OTHER'
  icon: string
  color: string
  sortOrder: number
  /** Expenses/recurring templates referencing this wallet — used to warn
   * before delete (>0 means delete archives instead of removing). */
  usageCount: number
}

export async function getWalletsForManagement(userId: string): Promise<ManagedWallet[]> {
  const rows = await db.wallet.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { expenses: true, recurring: true } } },
  })

  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    icon: w.icon,
    color: w.color,
    sortOrder: w.sortOrder,
    usageCount: w._count.expenses + w._count.recurring,
  }))
}

/** Wallets soft-archived by a delete that hit existing history — surfaced
 * so the user can restore one instead of it silently vanishing forever. */
export async function getArchivedWallets(userId: string): Promise<ManagedWallet[]> {
  const rows = await db.wallet.findMany({
    where: { userId, isArchived: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { expenses: true, recurring: true } } },
  })

  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    icon: w.icon,
    color: w.color,
    sortOrder: w.sortOrder,
    usageCount: w._count.expenses + w._count.recurring,
  }))
}
