export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark']
export const THEME_COOKIE = 'sarfi_theme'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export function isThemePreference(value: string | undefined | null): value is ThemePreference {
  return !!value && (THEME_PREFERENCES as string[]).includes(value)
}

/** DB stores the enum uppercase (SYSTEM/LIGHT/DARK); preference values are lowercase. */
export function themePreferenceFromDb(theme: string): ThemePreference {
  const lower = theme.toLowerCase()
  return isThemePreference(lower) ? lower : DEFAULT_THEME_PREFERENCE
}

export function dbThemeFromPreference(preference: ThemePreference): 'SYSTEM' | 'LIGHT' | 'DARK' {
  return preference.toUpperCase() as 'SYSTEM' | 'LIGHT' | 'DARK'
}
