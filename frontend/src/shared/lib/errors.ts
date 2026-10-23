import { ApiError } from '@/shared/api/client'
import { t } from '@/shared/lib/i18n'

/** A toast-ready message for any failure from a mutation. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : t('errors.network')
}
