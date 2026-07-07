export type Locale = 'en' | 'fr' | 'ar'
export const LOCALES: Locale[] = ['en', 'fr', 'ar']
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'sarfi_locale'

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as string[]).includes(value)
}

export function dir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** DB stores the enum uppercase (EN/FR/AR); i18n keys are lowercase. */
export function localeFromDbLang(lang: string): Locale {
  const lower = lang.toLowerCase()
  return isLocale(lower) ? lower : DEFAULT_LOCALE
}

export function dbLangFromLocale(locale: Locale): 'EN' | 'FR' | 'AR' {
  return locale.toUpperCase() as 'EN' | 'FR' | 'AR'
}

/** Best-effort Accept-Language parse — first supported tag wins. */
export function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null
  const tags = header.split(',').map((part) => part.split(';')[0].trim().toLowerCase().slice(0, 2))
  for (const tag of tags) {
    if (isLocale(tag)) return tag
  }
  return null
}

export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  fr: { native: 'Français', english: 'French' },
  ar: { native: 'العربية', english: 'Arabic' },
}
