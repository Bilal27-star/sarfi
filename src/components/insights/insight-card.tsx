import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react'
import type { InsightSeverity } from '@/server/services/insights'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES = {
  positive: { tint: 'bg-success-soft', fg: 'text-success', icon: TrendingDown },
  warning: { tint: 'bg-warning-soft', fg: 'text-warning', icon: AlertTriangle },
  neutral: { tint: 'bg-info-soft', fg: 'text-info', icon: Lightbulb },
} as const

type Props = {
  title: string
  message: string
  severity: InsightSeverity
  /** banner = Home's signature tinted callout (no border/shadow); compact = Insights list row */
  variant?: 'banner' | 'compact'
  className?: string
}

export function InsightCard({ title, message, severity, variant = 'banner', className }: Props) {
  const style = SEVERITY_STYLES[severity]
  const Icon = severity === 'warning' ? TrendingUp : style.icon

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-start gap-3 py-3', className)}>
        <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', style.tint, style.fg)} aria-hidden>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-title-card leading-tight">{title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-start gap-3 rounded-lg p-4', style.tint, className)}>
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/60', style.fg)} aria-hidden>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className={cn('text-title-card leading-tight', style.fg)}>{title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  )
}
