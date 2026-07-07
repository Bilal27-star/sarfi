import { createElement } from 'react'
import { categoryColor, categoryIcon } from '@/config/categories'
import { cn } from '@/lib/utils'

type Props = {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 'size-8 [&>svg]:size-4', md: 'size-10 [&>svg]:size-5', lg: 'size-12 [&>svg]:size-6' }

/** Round tinted icon chip used for categories and wallets. */
export function CategoryChip({ icon, color, size = 'md', className }: Props) {
  const colors = categoryColor(color)
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', colors.bg, colors.fg, SIZES[size], className)}
    >
      {createElement(categoryIcon(icon))}
    </span>
  )
}
