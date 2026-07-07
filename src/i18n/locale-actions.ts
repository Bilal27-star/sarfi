'use server'

import { cookies } from 'next/headers'
import { db } from '@/server/db'
import { getCurrentUser } from '@/server/auth/session'
import { LOCALE_COOKIE, dbLangFromLocale, isLocale } from '@/i18n/config'

/**
 * Persists the chosen language. Signed-in users get it written to their
 * profile (source of truth on next login/device); everyone also gets the
 * guest cookie set so pre-auth screens (onboarding, sign in) honor it too.
 */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const user = await getCurrentUser()
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { preferredLanguage: dbLangFromLocale(locale) } })
  }
}
