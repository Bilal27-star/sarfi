'use client'

import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { formatMoney } from '@/lib/money'
import { useLocale } from '@/i18n/provider'

type Props = {
  value: number
  currency?: string
  className?: string
  withSuffix?: boolean
}

/** Animated money figure. Falls back to a static value under reduced motion. */
export function AnimatedAmount({ value, currency = 'DZD', className, withSuffix = true }: Props) {
  const locale = useLocale()
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(reduced ? value : 0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduced) {
      if (ref.current) ref.current.textContent = formatMoney(value, { currency, locale, withSuffix })
      return
    }
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = formatMoney(Math.round(v), { currency, locale, withSuffix })
      },
    })
    return () => controls.stop()
  }, [value, currency, locale, withSuffix, motionValue, reduced])

  return (
    <span ref={ref} className={className} aria-label={formatMoney(value, { currency, locale, withSuffix })}>
      {formatMoney(reduced ? value : 0, { currency, locale, withSuffix })}
    </span>
  )
}
