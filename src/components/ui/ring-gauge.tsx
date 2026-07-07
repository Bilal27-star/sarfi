'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Props = {
  /** 0..1+ ; values over 1 mean over-guide, rendered in the danger tone */
  value: number
  size?: number
  label: string
  className?: string
}

/** Compact circular gauge — the Home hero's signature moment, standing in
 * for a generic horizontal progress bar inside a dark rectangle. */
export function RingGauge({ value, size = 64, label, className }: Props) {
  const reduced = useReducedMotion()
  const clamped = Math.min(Math.max(value, 0), 1.4)
  const displayFraction = Math.min(clamped, 1)
  const stroke = size * 0.11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = value > 1 ? 'var(--color-danger)' : value > 0.85 ? 'var(--color-accent-yellow)' : 'var(--color-primary)'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - displayFraction * c }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {value > 1 && (
        <span className="absolute text-[10px] font-extrabold text-danger">!</span>
      )}
    </div>
  )
}
