import type { Translator } from '@/i18n/translator'

/**
 * System categories are translated via stable slugs (categories.<slug>).
 * Custom user-created categories have no translation entry — t() returns the
 * key itself when a path is missing, which we detect and fall back to the
 * user's own stored name, so user-generated content is never machine-translated.
 */
export function categoryLabel(t: Translator, category: { slug: string; name: string }): string {
  const key = `categories.${category.slug}`
  const translated = t(key)
  return translated === key ? category.name : translated
}
