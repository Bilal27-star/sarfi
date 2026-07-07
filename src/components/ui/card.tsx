import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** hero = brand surface for the primary figure; sunken = quiet inline block */
  tone?: 'default' | 'hero' | 'sunken'
}

export function Card({ tone = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        tone === 'default' && 'bg-surface shadow-card border border-border-subtle',
        tone === 'hero' && 'bg-ink-900 text-white shadow-raised',
        tone === 'sunken' && 'bg-surface-sunken',
        className,
      )}
      {...props}
    />
  )
}
