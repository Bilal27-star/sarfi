'use client'

/**
 * Purpose-built, lightweight SVG charts. Each answers one question:
 * - TrendArea: "how is my spending moving day to day?"
 * - CategoryBars: "where does my money go?" (ranked, with amounts — replaces
 *   a donut+legend composition that read as generic BI dashboard chrome)
 * All scale with their container (viewBox) and stay legible at 320px.
 */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { categoryColor } from '@/config/categories'
import { formatCompact, formatMoney } from '@/lib/money'
import type { CategoryTotal, DailyTotal } from '@/server/services/expenses'

type ChartCategory = CategoryTotal & { label: string }

export function TrendArea({
  data,
  locale = 'en',
  ariaLabel,
  peakLabel,
}: {
  data: DailyTotal[]
  locale?: string
  ariaLabel: string
  peakLabel: string
}) {
  const reduced = useReducedMotion()
  const [active, setActive] = useState<number | null>(null)
  const W = 320
  const H = 120
  const PAD = 6
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }), [locale])

  const { path, area, points, max } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.total), 1)
    const stepX = (W - PAD * 2) / Math.max(data.length - 1, 1)
    const points = data.map((d, i) => ({
      x: PAD + i * stepX,
      y: H - PAD - (d.total / max) * (H - PAD * 2),
      ...d,
    }))
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area = `${path} L${points[points.length - 1]?.x ?? PAD},${H - PAD} L${PAD},${H - PAD} Z`
    return { path, area, points, max }
  }, [data])

  if (data.length === 0) return null
  const activePoint = active !== null ? points[active] : null

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs font-semibold text-text-muted">
        <span>{dateFmt.format(new Date(data[0].date))}</span>
        {activePoint ? (
          <span className="tnum text-text-primary">
            {dateFmt.format(new Date(activePoint.date))} · {formatMoney(activePoint.total, { locale })}
          </span>
        ) : (
          <span>
            {peakLabel} {formatCompact(max)}
          </span>
        )}
        <span>{dateFmt.format(new Date(data[data.length - 1].date))}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * W
          const idx = Math.round(((x - PAD) / (W - PAD * 2)) * (data.length - 1))
          setActive(Math.min(Math.max(idx, 0), data.length - 1))
        }}
        onPointerLeave={() => setActive(null)}
      >
        <path d={area} fill="var(--color-primary)" opacity={0.12} />
        <motion.path
          d={path}
          fill="none"
          stroke="var(--color-primary-pressed)"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        {activePoint && (
          <g>
            <line x1={activePoint.x} x2={activePoint.x} y1={PAD} y2={H - PAD} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
            <circle cx={activePoint.x} cy={activePoint.y} r={4.5} fill="var(--color-primary-pressed)" stroke="white" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  )
}

/**
 * Ranked spending distribution: each category is a labeled, proportional bar.
 * Chosen over a donut+legend (generic BI chrome, hard to scan at a glance on
 * mobile) — a ranked list answers "where did the money go?" directly, in
 * order of what matters most, and scales to any number of categories.
 */
export function CategoryBars({
  data,
  total,
  locale = 'en',
  limit = 6,
}: {
  data: ChartCategory[]
  total: number
  locale?: string
  limit?: number
}) {
  const reduced = useReducedMotion()
  const top = data.slice(0, limit)
  if (top.length === 0 || total <= 0) return null
  const max = top[0].total

  return (
    <ul className="space-y-3">
      {top.map((cat) => {
        const colors = categoryColor(cat.color)
        const share = Math.round((cat.total / total) * 100)
        return (
          <li key={cat.categoryId}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-title-card">{cat.label}</span>
              <span className="tnum shrink-0 font-semibold text-text-secondary">
                {formatMoney(cat.total, { locale })} <span className="text-text-muted">· {share}%</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors.bar }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(cat.total / max) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
