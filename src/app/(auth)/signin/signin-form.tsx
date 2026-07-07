'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/provider'
import { resolveAuthError, resolveFieldError } from '@/i18n/auth-error'

export function SignInForm() {
  const t = useT()
  const [state, action, pending] = useActionState(signIn, {})

  return (
    <div>
      <h1 className="text-title-screen text-2xl">{t('auth.welcomeBack')}</h1>
      <p className="mt-1 text-text-secondary">{t('auth.signInSubtitle')}</p>

      <form action={action} className="mt-6 space-y-4" noValidate>
        <Input
          label={t('auth.emailLabel')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          error={state.fieldErrorCodes?.email && resolveFieldError(t, state.fieldErrorCodes.email)}
          required
        />
        <div className="space-y-1.5">
          <Input
            label={t('auth.passwordLabel')}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={state.fieldErrorCodes?.password && resolveFieldError(t, state.fieldErrorCodes.password)}
            required
          />
          <div className="text-end">
            <Link href="/forgot-password" className="text-sm font-bold text-info hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>
        {state.errorCode && (
          <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            {resolveAuthError(t, state.errorCode)}
          </p>
        )}
        <Button full size="lg" type="submit" loading={pending}>
          {t('auth.signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-medium text-text-muted">
        {t('auth.noAccount')}{' '}
        <Link href="/signup" className="font-bold text-info hover:underline">
          {t('auth.createAccount')}
        </Link>
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <p className="mt-8 rounded-md bg-surface-sunken px-4 py-3 text-center text-xs font-medium text-text-muted">
          {t('auth.demoHint')}
        </p>
      )}
    </div>
  )
}
