'use server'

import { cookies } from 'next/headers'
import { db } from '@/server/db'
import { getCurrentUser } from '@/server/auth/session'
import { THEME_COOKIE, dbThemeFromPreference, isThemePreference } from './config'

/**
 * Persists the chosen appearance. Mirrors setLocale: signed-in users get it
 * written to UserPreferences (cross-device source of truth); everyone also
 * gets the guest cookie set so pre-auth screens honor it too. The client
 * applies the change to the DOM immediately on click — this call is
 * fire-and-forget persistence, not what makes the UI update.
 */
export async function setThemePreference(preference: string): Promise<void> {
  if (!isThemePreference(preference)) return
  const cookieStore = await cookies()
  cookieStore.set(THEME_COOKIE, preference, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const user = await getCurrentUser()
  if (user) {
    await db.userPreferences.upsert({
      where: { userId: user.id },
      update: { theme: dbThemeFromPreference(preference) },
      create: { userId: user.id, theme: dbThemeFromPreference(preference) },
    })
  }
}
