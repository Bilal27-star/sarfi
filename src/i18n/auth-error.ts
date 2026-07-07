import type { Translator } from '@/i18n/translator'

export type AuthErrorCode = 'rate_limited' | 'rate_limited_long' | 'invalid_credentials' | 'email_exists' | 'invalid_input'

export type AuthFieldErrorCode = 'name_min' | 'name_max' | 'email_invalid' | 'password_min' | 'password_max' | 'password_required'

export type AuthState = {
  errorCode?: AuthErrorCode
  fieldErrorCodes?: Partial<Record<'name' | 'email' | 'password', AuthFieldErrorCode>>
  sent?: boolean
}

export function resolveAuthError(t: Translator, code: AuthErrorCode): string {
  switch (code) {
    case 'rate_limited':
      return t('auth.errors.rateLimited')
    case 'rate_limited_long':
      return t('auth.errors.rateLimitedLong')
    case 'invalid_credentials':
      return t('auth.errors.invalidCredentials')
    case 'email_exists':
      return t('auth.errors.emailExists')
    case 'invalid_input':
    default:
      return t('auth.errors.generic')
  }
}

export function resolveFieldError(t: Translator, code: AuthFieldErrorCode): string {
  switch (code) {
    case 'name_min':
      return t('validation.nameMin')
    case 'name_max':
      return t('validation.nameMax')
    case 'email_invalid':
      return t('validation.emailInvalid')
    case 'password_min':
      return t('validation.passwordMin')
    case 'password_max':
      return t('validation.passwordMax')
    case 'password_required':
      return t('validation.passwordRequired')
    default:
      return t('auth.errors.generic')
  }
}
