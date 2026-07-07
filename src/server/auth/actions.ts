'use server'

import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/server/db'
import { createSession, destroySession, requireUser } from '@/server/auth/session'
import { rateLimit } from '@/server/auth/rate-limit'
import { signInSchema, signUpSchema, forgotPasswordSchema } from '@/lib/validation/auth'
import { setupSchema } from '@/lib/validation/expense'
import type { AuthState, AuthFieldErrorCode } from '@/i18n/auth-error'

async function clientKey(scope: string) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  return `${scope}:${ip}`
}

function fieldCodeFor(field: string, zodCode: string): AuthFieldErrorCode {
  if (field === 'email') return 'email_invalid'
  if (field === 'name') return zodCode === 'too_big' ? 'name_max' : 'name_min'
  if (field === 'password') return zodCode === 'too_big' ? 'password_max' : 'password_min'
  return 'email_invalid'
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey('signup'), { limit: 5, windowMs: 60_000 })) {
    return { errorCode: 'rate_limited' }
  }
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const fieldErrorCodes: AuthState['fieldErrorCodes'] = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as 'name' | 'email' | 'password'
      fieldErrorCodes[field] = fieldCodeFor(field, issue.code)
    }
    return { fieldErrorCodes }
  }
  const { name, email, password } = parsed.data
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return { fieldErrorCodes: { email: 'email_invalid' }, errorCode: 'email_exists' }
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      preferences: { create: { onboardingCompleted: true } },
      wallets: { create: { name: 'Cash', type: 'CASH', icon: 'banknote', color: 'primary' } },
    },
  })
  await createSession(user.id)
  redirect('/setup')
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey('signin'), { limit: 10, windowMs: 60_000 })) {
    return { errorCode: 'rate_limited' }
  }
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const fieldErrorCodes: AuthState['fieldErrorCodes'] = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as 'name' | 'email' | 'password'
      fieldErrorCodes[field] = field === 'password' ? 'password_required' : fieldCodeFor(field, issue.code)
    }
    return { fieldErrorCodes }
  }
  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { preferences: true },
  })
  // Same generic response for unknown email and wrong password — no account enumeration
  const invalid: AuthState = { errorCode: 'invalid_credentials' }
  if (!user) return invalid
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return invalid
  await createSession(user.id)
  redirect(user.preferences?.setupCompleted ? '/home' : '/setup')
}

export async function signOut(): Promise<void> {
  await destroySession()
  redirect('/signin')
}

export async function forgotPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey('forgot'), { limit: 5, windowMs: 300_000 })) {
    return { errorCode: 'rate_limited_long' }
  }
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { fieldErrorCodes: { email: 'email_invalid' } }
  }
  // Email delivery is not wired yet (no provider). The UI foundation is real;
  // we intentionally return the same response whether or not the account exists.
  return { sent: true }
}

export async function completeSetup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser()
  const parsed = setupSchema.safeParse({
    currency: formData.get('currency'),
    monthlyBudget: formData.get('monthlyBudget') ?? '',
    financialMonthStartDay: formData.get('financialMonthStartDay'),
    language: formData.get('language'),
  })
  if (!parsed.success) {
    return { errorCode: 'invalid_input' }
  }
  const { currency, monthlyBudget, financialMonthStartDay, language } = parsed.data
  await db.user.update({
    where: { id: user.id },
    data: {
      preferredCurrency: currency,
      preferredLanguage: language,
      preferences: {
        upsert: {
          create: { setupCompleted: true, onboardingCompleted: true, financialMonthStartDay },
          update: { setupCompleted: true, financialMonthStartDay },
        },
      },
    },
  })
  if (monthlyBudget) {
    const existing = await db.budget.findFirst({ where: { userId: user.id, categoryId: null } })
    if (existing) {
      await db.budget.update({ where: { id: existing.id }, data: { amount: monthlyBudget } })
    } else {
      await db.budget.create({
        data: {
          userId: user.id,
          amount: monthlyBudget,
          currency,
          periodType: 'MONTHLY',
          startDate: new Date(),
        },
      })
    }
  }
  redirect('/home')
}
