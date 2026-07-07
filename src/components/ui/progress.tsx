'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Props = {
  /** 0..1, values above 1 are clamped and shown as over-budget */
  value: number
  label: string
  tone?: 'auto' | 'positive' | 'warning' | 'danger' | 'onDark'
  className?: string
}

export function ProgressBar({ value, label, tone = 'auto', className }: Props) {
  const reduced = useReducedMotion()
  const clamped = Math.min(Math.max(value, 0), 1)
  const resolved =
    tone === 'auto' ? (value > 1 ? 'danger' : value > 0.85 ? 'warning' : 'positive') : tone

  const barColor = {
    positive: 'bg-primary',
    warning: 'bg-accent-yellow',
    danger: 'bg-danger',
    onDark: 'bg-primary',
  }[resolved]

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
      className={cn(
        'h-2.5 w-full overflow-hidden rounded-full',
        tone === 'onDark' ? 'bg-white/15' : 'bg-surface-sunken',
        className,
      )}
    >
      <motion.div
        className={cn('h-full rounded-full', barColor)}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}
