import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  icon: LucideIcon
  title: string
  message: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, message, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon className="size-8 text-success" aria-hidden />
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
