import 'server-only'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/server/auth/session'
import { THEME_COOKIE, isThemePreference, themePreferenceFromDb, type ThemePreference } from './config'

/**
 * Preference resolution order mirrors getServerLocale: authenticated user
 * preference (DB, cross-device) > guest cookie (works pre-auth, e.g.
 * signin/welcome) > 'system' default. The resolved *preference* (which may
 * be 'system') is what the client needs — actually resolving 'system' to
 * light/dark requires prefers-color-scheme, which only the client can read
 * reliably; see the boot script in layout.tsx for that half.
 */
export async function getServerThemePreference(): Promise<ThemePreference> {
  const user = await getCurrentUser()
  if (user?.preferences?.theme) return themePreferenceFromDb(user.preferences.theme)

  const cookieStore = await cookies()
  const cookiePreference = cookieStore.get(THEME_COOKIE)?.value
  if (isThemePreference(cookiePreference)) return cookiePreference

  return 'system'
}
