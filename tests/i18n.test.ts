import { describe, expect, it } from 'vitest'
import { dictionaries, createTranslator } from '@/i18n/translator'
import { LOCALES, dir } from '@/i18n/config'
import { formatMoney } from '@/lib/money'

// Structural key parity between locales is enforced at compile time: fr.ts and
// ar.ts are typed as `typeof en`, so a missing/extra key is a TypeScript error
// long before this test runs. These tests cover the runtime behaviors that
// static typing can't: resolution, pluralization, direction, and formatting.

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

/** Plural-form objects (e.g. { one: "...", other: "..." }) are a single leaf —
 * locales legitimately vary in which CLDR categories they populate (Arabic has
 * 6, English has 2), so we don't diff their internal keys. */
function isPluralForm(obj: object): boolean {
  return Object.keys(obj).every((k) => PLURAL_CATEGORIES.has(k))
}

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  if (isPluralForm(obj)) return [prefix]
  return Object.entries(obj).flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k))
}

describe('translation key parity', () => {
  const keysByLocale = LOCALES.map((locale) => [locale, new Set(flattenKeys(dictionaries[locale]))] as const)

  it('every locale exposes the same key set as English', () => {
    const [, enKeys] = keysByLocale[0]
    for (const [locale, keys] of keysByLocale) {
      const missing = [...enKeys].filter((k) => !keys.has(k))
      const extra = [...keys].filter((k) => !enKeys.has(k))
      expect(missing, `${locale} missing keys: ${missing.join(', ')}`).toHaveLength(0)
      expect(extra, `${locale} has extra keys: ${extra.join(', ')}`).toHaveLength(0)
    }
  })
})

describe('createTranslator', () => {
  it('resolves nested keys per locale', () => {
    expect(createTranslator('en')('navigation.home')).toBe('Home')
    expect(createTranslator('fr')('navigation.home')).toBe('Accueil')
    expect(createTranslator('ar')('navigation.home')).toBe('الرئيسية')
  })

  it('interpolates params', () => {
    expect(createTranslator('en')('onboarding.progress', { current: 1, total: 3 })).toBe('Step 1 of 3')
  })

  it('falls back to the key itself for a genuinely missing path (custom category)', () => {
    expect(createTranslator('en')('categories.my-custom-category')).toBe('categories.my-custom-category')
  })

  it('pluralizes English as one/other', () => {
    const t = createTranslator('en')
    expect(t('home.daysLeft', { count: 1 })).toBe('1 day left')
    expect(t('home.daysLeft', { count: 5 })).toBe('5 days left')
  })

  it('pluralizes Arabic across zero/one/two/few/many/other', () => {
    const t = createTranslator('ar')
    expect(t('home.daysLeft', { count: 1 })).toContain('يوم واحد')
    expect(t('home.daysLeft', { count: 2 })).toContain('يومان')
    expect(t('home.daysLeft', { count: 5 })).toContain('5')
  })
})

describe('direction', () => {
  it('Arabic is rtl, English and French are ltr', () => {
    expect(dir('ar')).toBe('rtl')
    expect(dir('en')).toBe('ltr')
    expect(dir('fr')).toBe('ltr')
  })
})

describe('locale-aware money formatting', () => {
  it('changes number grouping and currency suffix per locale', () => {
    expect(formatMoney(4030, { locale: 'en' })).toBe('4,030 DZD')
    expect(formatMoney(4030, { locale: 'ar' })).toContain('دج')
  })
})
