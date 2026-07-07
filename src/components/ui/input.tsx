'use client'

import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/i18n/provider'
import { cn } from '@/lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, type = 'text', className, id: idProp, ...props },
  ref,
) {
  const t = useT()
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const effectiveType = isPassword && showPassword ? 'text' : type

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'w-full h-12 rounded-md border bg-surface px-4 text-base text-text-primary placeholder:text-text-muted',
            'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
            error ? 'border-danger focus:border-danger focus:ring-danger/25' : 'border-border-strong',
            isPassword && 'pe-12',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            className="absolute inset-y-0 end-2 my-auto flex size-9 items-center justify-center rounded-sm text-text-muted hover:text-text-primary"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
