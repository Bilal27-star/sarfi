import type { Locale } from '@/i18n/config'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { en } from '@/i18n/locales/en'
import { fr } from '@/i18n/locales/fr'
import { ar } from '@/i18n/locales/ar'

export const dictionaries = { en, fr, ar } satisfies Record<Locale, unknown>
export type Dictionary = typeof en

type PluralForm = Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>>
type Params = Record<string, string | number>

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''))
}

function isPluralForm(value: unknown): value is PluralForm {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type Translator = (key: string, params?: Params) => string

/**
 * Resolves `key` (dot path, e.g. "insights.categoryIncrease.title") against the
 * active locale, falling back to English for genuinely missing keys so the UI
 * never renders blank. Objects are treated as ICU-lite plural forms selected
 * via Intl.PluralRules when `params.count` is provided.
 */
export function createTranslator(locale: Locale): Translator {
  const dict = dictionaries[locale]
  const fallback = dictionaries[DEFAULT_LOCALE]
  return function t(key: string, params?: Params): string {
    let value = getPath(dict, key)
    if (value === undefined) value = getPath(fallback, key)
    if (value === undefined) return key

    if (isPluralForm(value)) {
      if (typeof params?.count === 'number') {
        const category = new Intl.PluralRules(locale).select(params.count)
        const form = value[category] ?? value.other ?? Object.values(value)[0]
        return form ? interpolate(form, params) : key
      }
      const first = value.other ?? Object.values(value)[0]
      return first ? interpolate(first, params) : key
    }

    if (typeof value === 'string') return interpolate(value, params)
    return key
  }
}
