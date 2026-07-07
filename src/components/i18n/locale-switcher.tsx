'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALES } from '@/i18n/config'
import { setLocale } from '@/i18n/locale-actions'
import { useLocale } from '@/i18n/provider'
import { cn } from '@/lib/utils'

/** Compact pre-auth language toggle (onboarding, sign in) — guests can pick a
 * language before any account exists; the choice is persisted via cookie and
 * carried over to the account once they sign up. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const active = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className={cn('inline-flex gap-0.5 rounded-full bg-surface-sunken p-1', className)}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-pressed={locale === active}
          onClick={() =>
            startTransition(async () => {
              await setLocale(locale)
              router.refresh()
            })
          }
          className={cn(
            'min-h-8 rounded-full px-2.5 text-xs font-bold uppercase transition-colors',
            locale === active ? 'bg-ink-900 text-white' : 'text-text-secondary',
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
