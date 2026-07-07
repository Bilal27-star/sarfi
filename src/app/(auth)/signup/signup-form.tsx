'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/provider'
import { resolveAuthError, resolveFieldError } from '@/i18n/auth-error'

export function SignUpForm() {
  const t = useT()
  const [state, action, pending] = useActionState(signUp, {})

  return (
    <div>
      <h1 className="text-title-screen text-2xl">{t('auth.createAccountTitle')}</h1>
      <p className="mt-1 text-text-secondary">{t('auth.createAccountSubtitle')}</p>

      <form action={action} className="mt-6 space-y-4" noValidate>
        <Input
          label={t('auth.nameLabel')}
          name="name"
          autoComplete="name"
          placeholder={t('auth.nameLabel')}
          error={state.fieldErrorCodes?.name && resolveFieldError(t, state.fieldErrorCodes.name)}
          required
        />
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
        <Input
          label={t('auth.passwordLabel')}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t('common.passwordHintChars')}
          hint={t('validation.passwordMin')}
          error={state.fieldErrorCodes?.password && resolveFieldError(t, state.fieldErrorCodes.password)}
          required
        />
        {state.errorCode && (
          <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            {resolveAuthError(t, state.errorCode)}
          </p>
        )}
        <Button full size="lg" type="submit" loading={pending}>
          {t('auth.createAccount')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-medium text-text-muted">
        {t('auth.haveAccount')}{' '}
        <Link href="/signin" className="font-bold text-info hover:underline">
          {t('auth.signInLink')}
        </Link>
      </p>
    </div>
  )
}
