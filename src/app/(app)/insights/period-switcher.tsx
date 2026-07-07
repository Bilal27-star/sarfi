'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { PeriodKey } from '@/lib/dates'
import { useT } from '@/i18n/provider'
import { cn } from '@/lib/utils'

export function PeriodSwitcher({
  periods,
  active,
}: {
  periods: { key: PeriodKey; label: string }[]
  active: PeriodKey
}) {
  const t = useT()
  return (
    <div role="tablist" aria-label={t('common.timePeriodAria')} className="inline-flex gap-0.5 rounded-full bg-surface-sunken p-1">
      {periods.map((p) => (
        <Link
          key={p.key}
          role="tab"
          aria-selected={p.key === active}
          href={`/insights?period=${p.key}`}
          scroll={false}
          className={cn(
            'relative rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors',
            p.key === active ? 'text-text-on-primary' : 'text-text-secondary',
          )}
        >
          {p.key === active && (
            <motion.span
              layoutId="period-active"
              className="absolute inset-0 rounded-full bg-ink-900"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">{p.label}</span>
        </Link>
      ))}
    </div>
  )
}
