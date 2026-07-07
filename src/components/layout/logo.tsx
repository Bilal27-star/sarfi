import { cn } from '@/lib/utils'

/**
 * SARFI brand mark — "the loop": a 270° open ring with a companion dot
 * approaching its mouth, reading as a single dinar flowing in and being
 * absorbed into a continuous, controlled loop of tracked spending. Chosen
 * over two other explored directions — an ascending sparkline-through-bars
 * (too close to a generic analytics-app icon) and a bisected coin/valve
 * (read too easily as a piggy bank or a bitten coin) — for being the most
 * original, legible at 24px, and true to "track every dinar, see the loop."
 */
export function LogoMark({ className, monochrome = false }: { className?: string; monochrome?: boolean }) {
  const ringColor = monochrome ? 'currentColor' : 'var(--color-primary)'
  return (
    <svg viewBox="0 0 48 48" className={cn('size-9', className)} aria-hidden>
      {!monochrome && <rect x="1" y="1" width="46" height="46" rx="14" fill="var(--color-ink-900)" />}
      <path
        d="M38.09 29.13A15 15 0 1 1 29.13 9.91"
        fill="none"
        stroke={ringColor}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="37.6" cy="17.66" r="4.2" fill={ringColor} />
    </svg>
  )
}

export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-tight text-text-primary', className)}>
      SARFI <span className="text-text-muted font-semibold text-[0.75em] font-arabic">صرفي</span>
    </span>
  )
}
