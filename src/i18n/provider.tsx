'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { dir } from '@/i18n/config'
import { createTranslator, type Translator } from '@/i18n/translator'

type I18nContextValue = { locale: Locale; dir: 'ltr' | 'rtl'; t: Translator }

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Locale is computed once, server-side (see getServerLocale), and passed in
 * as a prop — never re-derived on the client — so there is no hydration
 * mismatch between the server-rendered html[dir] and the client tree.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(() => ({ locale, dir: dir(locale), t: createTranslator(locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT/useLocale must be used within I18nProvider')
  return ctx
}

export function useT(): Translator {
  return useI18n().t
}

export function useLocale(): Locale {
  return useI18n().locale
}

export function useDir(): 'ltr' | 'rtl' {
  return useI18n().dir
}
