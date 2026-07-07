import { z } from 'zod'

/** Amounts cross the wire as canonical decimal strings — never floats. */
export const moneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
  .refine((v) => Number(v) > 0, 'Amount must be greater than zero')
  .refine((v) => Number(v) <= 9_999_999_999.99, 'Amount is too large')

export const createExpenseSchema = z.object({
  amount: moneyString,
  description: z.string().trim().min(1, 'What was it?').max(120),
  categoryId: z.string().min(1, 'Pick a category'),
  walletId: z.string().optional(),
  merchant: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  expenseDate: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string().min(1),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

export const setupSchema = z.object({
  currency: z.literal('DZD'), // architecture supports more; DZD only for launch
  monthlyBudget: moneyString.optional().or(z.literal('')),
  financialMonthStartDay: z.coerce.number().int().min(1).max(28),
  language: z.enum(['AR', 'FR', 'EN']),
})
export type SetupInput = z.infer<typeof setupSchema>
