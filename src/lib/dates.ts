/** Date helpers. All computations happen in the server's local time for MVP;
 *  per-user timezone application is stored on User and is a documented next step. */
import type { Translator } from '@/i18n/translator'

const INTL_LOCALE: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-DZ' }
function intlLocale(locale: string): string {
  return INTL_LOCALE[locale.toLowerCase()] ?? 'en-GB'
}

export type DateRange = { start: Date; end: Date }

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

/**
 * The "financial month" can start on any day (e.g. payday the 25th).
 * Returns the current financial month range containing `now`.
 */
export function financialMonthRange(now: Date, startDay: number): DateRange {
  const day = Math.min(Math.max(startDay, 1), 28)
  let start = new Date(now.getFullYear(), now.getMonth(), day)
  if (now < start) start = new Date(now.getFullYear(), now.getMonth() - 1, day)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day)
  end.setMilliseconds(-1)
  return { start, end }
}

export function previousRange(range: DateRange): DateRange {
  const length = range.end.getTime() - range.start.getTime()
  return { start: new Date(range.start.getTime() - length - 1), end: new Date(range.start.getTime() - 1) }
}

export type PeriodKey = '7d' | '30d' | '3m' | '1y'

export function periodRange(period: PeriodKey, now = new Date()): DateRange {
  const end = endOfDay(now)
  const days: Record<PeriodKey, number> = { '7d': 7, '30d': 30, '3m': 91, '1y': 365 }
  const start = startOfDay(addDays(now, -(days[period] - 1)))
  return { start, end }
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

/** "Today" / "Yesterday" / "Thursday, 3 Jul" — locale-aware, translated via t(). */
export function dayLabel(date: Date, locale: string, t: Translator, now = new Date()): string {
  const diff = daysBetween(date, now)
  if (diff === 0) return t('transactions.today')
  if (diff === 1) return t('transactions.yesterday')
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { weekday: 'long', month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(date)
}

export function timeLabel(date: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function fullDateLabel(date: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function weekdayLabel(weekdayIndex: number, locale = 'en'): string {
  // 2023-01-01 was a Sunday — a stable anchor to derive any weekday name from its index (0=Sun..6=Sat)
  const anchor = new Date(2023, 0, 1 + weekdayIndex)
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long' }).format(anchor)
}

export function greetingKeyFor(now = new Date()): 'greetingLate' | 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const h = now.getHours()
  if (h < 5) return 'greetingLate'
  if (h < 12) return 'greetingMorning'
  if (h < 18) return 'greetingAfternoon'
  return 'greetingEvening'
}

/** yyyy-mm-dd for date inputs */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
