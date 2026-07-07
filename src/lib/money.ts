/**
 * Money handling.
 *
 * Strategy (documented, deliberate):
 * - The database stores amounts as Decimal(12, 2) — never floats.
 * - Across the server boundary amounts travel as *strings* ("1250.00").
 * - For display we convert to number only at the last step; values fit
 *   comfortably within Number's safe integer range at Decimal(12,2).
 * - Arithmetic on collections is done in integer minor units (centimes).
 */

export type Money = string // canonical decimal string, e.g. "1250.00"

const DECIMALS = 2
const MINOR = 10 ** DECIMALS

/** "1250.5" | 1250.5 -> integer minor units (125050). Throws on invalid input. */
export function toMinor(amount: string | number): number {
  const s = typeof amount === 'number' ? amount.toFixed(DECIMALS) : amount.trim()
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error(`Invalid money amount: ${amount}`)
  }
  const [int, frac = ''] = s.split('.')
  const sign = int.startsWith('-') ? -1 : 1
  const intPart = Math.abs(parseInt(int, 10))
  const fracPart = parseInt(frac.padEnd(DECIMALS, '0'), 10)
  return sign * (intPart * MINOR + fracPart)
}

/** integer minor units -> canonical decimal string */
export function fromMinor(minor: number): Money {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(Math.round(minor))
  const int = Math.floor(abs / MINOR)
  const frac = String(abs % MINOR).padStart(DECIMALS, '0')
  return `${sign}${int}.${frac}`
}

export function addMoney(...amounts: Money[]): Money {
  return fromMinor(amounts.reduce((sum, a) => sum + toMinor(a), 0))
}

/** Validates raw keypad/user input like "1250" or "1250.5". */
export function isValidAmountInput(input: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(input)) return false
  const minor = toMinor(input)
  return minor > 0 && minor <= 9_999_999_999_99 // Decimal(12,2) bound
}

const INTL_LOCALE: Record<string, string> = {
  en: 'en-DZ',
  fr: 'fr-DZ',
  ar: 'ar-DZ',
}

const CURRENCY_SUFFIX: Record<string, Record<string, string>> = {
  DZD: { en: 'DZD', fr: 'DZD', ar: 'دج' },
}

/**
 * Formats an amount for display: "1,250 DZD", "1 250 DZD", "١٬٢٥٠ دج".
 * Whole amounts drop the decimal part — expense amounts in DZD are
 * almost always whole, and trailing ".00" adds noise.
 *
 * `locale` accepts the app's lowercase Locale ('en'|'fr'|'ar'); legacy
 * uppercase DB values ('EN'|'FR'|'AR') are normalized for convenience.
 */
export function formatMoney(
  amount: Money | number,
  { currency = 'DZD', locale = 'en', withSuffix = true }: { currency?: string; locale?: string; withSuffix?: boolean } = {},
): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  const key = locale.toLowerCase()
  const intlLocale = INTL_LOCALE[key] ?? 'en-DZ'
  const hasFraction = Math.round(value * MINOR) % MINOR !== 0
  const formatted = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: hasFraction ? DECIMALS : 0,
    maximumFractionDigits: DECIMALS,
    // Keep Latin digits even in Arabic UI — clearer for amounts, standard in DZ fintech
    numberingSystem: 'latn',
  }).format(value)
  if (!withSuffix) return formatted
  const suffix = CURRENCY_SUFFIX[currency]?.[key] ?? currency
  return `${formatted} ${suffix}`
}

/** Compact display for chart axes: 12500 -> "12.5k" */
export function formatCompact(amount: Money | number): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(value))
}
