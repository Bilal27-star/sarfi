import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ink'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'btn-tactile bg-primary text-text-on-primary [--btn-shadow-color:var(--color-primary-pressed)] hover:bg-primary-hover',
  ink: 'btn-tactile bg-ink-900 text-white [--btn-shadow-color:#000000] hover:bg-ink-700',
  secondary:
    'bg-surface border border-border-strong text-text-primary hover:bg-surface-sunken active:scale-[0.98] transition',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-sunken active:scale-[0.98] transition',
  danger:
    'btn-tactile bg-danger text-white [--btn-shadow-color:#b03723] hover:opacity-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-sm',
  md: 'h-12 px-5 text-base rounded-md',
  lg: 'h-14 px-6 text-lg rounded-md',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, full, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
