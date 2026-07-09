import { cn } from '@/lib/utils'

/**
 * SARFI brand mark — "the sarf path": an S monogram built from two opposing
 * 270° loops that meet at a single central point, with one dot above the
 * entry terminal. The top loop turns counterclockwise (money in), the bottom
 * turns clockwise (money out) — income and expense resolved into one
 * continuous, controlled path through a balance point. The dot is the dinar
 * entering the flow, and a bilingual nod: صرفي is written with ف, whose
 * single diacritic dot sits above the letter body exactly as here.
 *
 * Geometry is exported so the splash animation can construct the mark from
 * its real path rather than animating a flattened copy.
 */
export const MARK_VIEWBOX = '0 0 48 48'
export const MARK_S_PATH = 'M31.5 16.5A7.5 7.5 0 1 0 24 24A7.5 7.5 0 1 1 16.5 31.5'
export const MARK_STROKE_WIDTH = 6.5
export const MARK_DOT = { cx: 34, cy: 6.5, r: 2.5 }

export function LogoMark({ className, monochrome = false }: { className?: string; monochrome?: boolean }) {
  const inkColor = monochrome ? 'currentColor' : 'var(--color-primary)'
  return (
    <svg viewBox={MARK_VIEWBOX} className={cn('size-9', className)} aria-hidden>
      {!monochrome && <rect x="1" y="1" width="46" height="46" rx="14" fill="var(--color-ink-900)" />}
      <path
        d={MARK_S_PATH}
        fill="none"
        stroke={inkColor}
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill={inkColor} />
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
