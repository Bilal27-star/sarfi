import 'server-only'
import { cookies, headers } from 'next/headers'
import { getCurrentUser } from '@/server/auth/session'
import { createTranslator } from '@/i18n/translator'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromDbLang, parseAcceptLanguage, type Locale } from '@/i18n/config'

/**
 * Locale resolution order: authenticated user preference (DB) > guest cookie
 * > browser Accept-Language > default. Authenticated preference wins over the
 * cookie so a user who signs in on a new device still gets their saved language.
 */
export async function getServerLocale(): Promise<Locale> {
  const user = await getCurrentUser()
  if (user?.preferredLanguage) return localeFromDbLang(user.preferredLanguage)

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(cookieLocale)) return cookieLocale

  const fromHeader = parseAcceptLanguage((await headers()).get('accept-language'))
  if (fromHeader) return fromHeader

  return DEFAULT_LOCALE
}

export async function getServerTranslator() {
  const locale = await getServerLocale()
  return { locale, t: createTranslator(locale) }
}
