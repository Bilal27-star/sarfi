'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { moneyString } from '@/lib/validation/expense'
import type { ActionResult } from '@/server/services/expense-actions'

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  language: z.enum(['AR', 'FR', 'EN']).optional(),
  monthlyBudget: moneyString.or(z.literal('')).optional(),
  financialMonthStartDay: z.coerce.number().int().min(1).max(28).optional(),
})

export async function updateSettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = settingsSchema.safeParse(input)
    if (!parsed.success) return { ok: false, errorCode: 'invalid_input' }
    const { name, language, monthlyBudget, financialMonthStartDay } = parsed.data

    if (name || language) {
      await db.user.update({
        where: { id: user.id },
        data: { ...(name ? { name } : {}), ...(language ? { preferredLanguage: language } : {}) },
      })
    }
    if (financialMonthStartDay) {
      await db.userPreferences.upsert({
        where: { userId: user.id },
        update: { financialMonthStartDay },
        create: { userId: user.id, financialMonthStartDay },
      })
    }
    if (monthlyBudget !== undefined) {
      const existing = await db.budget.findFirst({ where: { userId: user.id, categoryId: null } })
      if (monthlyBudget === '') {
        if (existing) await db.budget.delete({ where: { id: existing.id } })
      } else if (existing) {
        await db.budget.update({ where: { id: existing.id }, data: { amount: monthlyBudget } })
      } else {
        await db.budget.create({
          data: {
            userId: user.id,
            amount: monthlyBudget,
            currency: user.preferredCurrency,
            periodType: 'MONTHLY',
            startDate: new Date(),
          },
        })
      }
    }
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}
