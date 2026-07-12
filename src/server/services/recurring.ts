import { db } from '@/server/db'

export type ManagedRecurring = {
  id: string
  description: string
  amount: string
  currency: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextDueDate: string
  isActive: boolean
  category: { id: string; name: string; slug: string; icon: string; color: string }
  wallet: { id: string; name: string } | null
}

export async function getRecurringForManagement(userId: string): Promise<ManagedRecurring[]> {
  const rows = await db.recurringExpense.findMany({
    where: { userId },
    orderBy: { nextDueDate: 'asc' },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      wallet: { select: { id: true, name: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount.toString(),
    currency: r.currency,
    frequency: r.frequency,
    nextDueDate: r.nextDueDate.toISOString(),
    isActive: r.isActive,
    category: r.category,
    wallet: r.wallet,
  }))
}
