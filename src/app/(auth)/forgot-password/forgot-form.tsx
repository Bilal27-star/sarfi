'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { forgotPassword } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n/provider'
import { resolveAuthError, resolveFieldError } from '@/i18n/auth-error'

export function ForgotPasswordForm() {
  const t = useT()
  const [state, action, pending] = useActionState(forgotPassword, {})

  if (state.sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft">
          <MailCheck className="size-7 text-success" aria-hidden />
        </div>
        <h1 className="text-title-screen text-2xl">{t('auth.checkInboxTitle')}</h1>
        <p className="mt-2 text-text-secondary">{t('auth.checkInboxMessage')}</p>
        <Link href="/signin" className="mt-6 inline-block font-bold text-info hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-title-screen text-2xl">{t('auth.forgotPasswordTitle')}</h1>
      <p className="mt-1 text-text-secondary">{t('auth.forgotPasswordSubtitle')}</p>

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
        {state.errorCode && (
          <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            {resolveAuthError(t, state.errorCode)}
          </p>
        )}
        <Button full size="lg" type="submit" loading={pending}>
          {t('auth.sendResetLink')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-medium text-text-muted">
        {t('auth.rememberedIt')}{' '}
        <Link href="/signin" className="font-bold text-info hover:underline">
          {t('auth.signInLink')}
        </Link>
      </p>
    </div>
  )
}
