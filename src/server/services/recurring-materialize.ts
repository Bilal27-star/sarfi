import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import type { Frequency } from '@/generated/prisma/client'

/** Native Date math: correct for DAILY/WEEKLY always, and for MONTHLY/YEARLY
 * in the vast majority of cases. Known edge case — setMonth on a day that
 * doesn't exist in the target month (e.g. Jan 31 -> Feb) rolls forward into
 * the following month (JS Date semantics), same quirk most calendar apps
 * have without a dedicated date library. Acceptable for MVP. */
function addByFrequency(date: Date, frequency: Frequency): Date {
  const d = new Date(date)
  switch (frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + 1)
      break
    case 'WEEKLY':
      d.setDate(d.getDate() + 7)
      break
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1)
      break
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d
}

/** Defensive cap on catch-up iterations per template per run (e.g. a
 * template dormant for years) — dates strictly increase each iteration so
 * the loop always terminates on its own; this just bounds worst-case work. */
const MAX_CATCHUP_PER_TEMPLATE = 500

export type MaterializeSummary = { templatesProcessed: number; expensesCreated: number }

/**
 * Turns every due RecurringExpense into a real Expense, advancing
 * nextDueDate past `now` (materializing every missed occurrence along the
 * way, e.g. after downtime). Safe to invoke concurrently or repeatedly:
 * each advance is a compare-and-swap on nextDueDate (updateMany with the
 * old value in the WHERE clause) — if another invocation already moved it,
 * this one's update matches zero rows and simply stops for that template.
 */
export async function materializeDueRecurring(now: Date = new Date()): Promise<MaterializeSummary> {
  const due = await db.recurringExpense.findMany({
    where: { isActive: true, nextDueDate: { lte: now } },
    select: { id: true },
  })

  let expensesCreated = 0

  for (const { id } of due) {
    for (let i = 0; i < MAX_CATCHUP_PER_TEMPLATE; i++) {
      const template = await db.recurringExpense.findUnique({ where: { id } })
      if (!template || !template.isActive || template.nextDueDate > now) break

      const occurrenceDate = template.nextDueDate
      const next = addByFrequency(occurrenceDate, template.frequency)

      const advanced = await db.recurringExpense.updateMany({
        where: { id, nextDueDate: occurrenceDate },
        data: { nextDueDate: next },
      })
      if (advanced.count === 0) break // raced with another run

      await db.expense.create({
        data: {
          userId: template.userId,
          categoryId: template.categoryId,
          walletId: template.walletId,
          amount: template.amount,
          currency: template.currency,
          description: template.description,
          expenseDate: occurrenceDate,
        },
      })

      const day = new Date(occurrenceDate)
      day.setHours(0, 0, 0, 0)
      await db.dailyTracking.upsert({
        where: { userId_date: { userId: template.userId, date: day } },
        update: { expenseCount: { increment: 1 }, trackingCompleted: true },
        create: { userId: template.userId, date: day, expenseCount: 1, trackingCompleted: true },
      })

      expensesCreated++
    }
  }

  if (expensesCreated > 0) {
    revalidatePath('/home')
    revalidatePath('/transactions')
    revalidatePath('/insights')
  }

  return { templatesProcessed: due.length, expensesCreated }
}
