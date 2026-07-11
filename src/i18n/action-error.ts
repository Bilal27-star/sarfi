import type { Translator } from '@/i18n/translator'

/**
 * Server actions never return raw Zod/DB error text (it would always be
 * English and could leak internals). They return one of these stable codes;
 * the client resolves it to localized copy via this map.
 */
export type ActionErrorCode =
  | 'unauthenticated'
  | 'invalid_input'
  | 'not_found'
  | 'save_failed'
  | 'update_failed'
  | 'delete_failed'
  | 'duplicate_failed'
  | 'avatar_invalid_type'
  | 'avatar_too_large'
  | 'avatar_storage_unavailable'
  | 'avatar_upload_failed'
  | 'avatar_remove_failed'
  | 'category_forbidden'

export function resolveActionError(t: Translator, code: ActionErrorCode): string {
  switch (code) {
    case 'unauthenticated':
      return t('auth.errors.sessionExpired')
    case 'invalid_input':
      return t('expenses.invalidInput')
    case 'not_found':
      return t('expenses.notFound')
    case 'update_failed':
      return t('expenses.updateError')
    case 'delete_failed':
      return t('expenses.deleteError')
    case 'duplicate_failed':
      return t('expenses.duplicateError')
    case 'avatar_invalid_type':
      return t('profile.avatar.errorInvalidType')
    case 'avatar_too_large':
      return t('profile.avatar.errorTooLarge')
    case 'avatar_storage_unavailable':
      return t('profile.avatar.errorStorageUnavailable')
    case 'avatar_upload_failed':
      return t('profile.avatar.errorProcessing')
    case 'avatar_remove_failed':
      return t('profile.avatar.errorRemoveFailed')
    case 'category_forbidden':
      return t('profile.categoriesManage.errorForbidden')
    case 'save_failed':
    default:
      return t('expenses.savingError')
  }
}
