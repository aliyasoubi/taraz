import { messages } from '@/shared/lib/i18n'
import type { AccountKind, ChequeStatus, PaymentMethod, TreatmentKind, TxType } from '@/shared/api/types'

export const TX_LABEL: Record<TxType, string> = messages.tx
export const TX_SHORT_LABEL: Record<TxType, string> = messages.txShort
export const METHOD_LABEL: Record<PaymentMethod, string> = messages.method
export const CHEQUE_LABEL: Record<ChequeStatus, string> = messages.cheque
export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = messages.accountKind
export const TREATMENT_LABEL: Record<TreatmentKind, string> = messages.treatment
export const BANKS: string[] = messages.banks
export const QUICK_NOTES: Record<TxType, string[]> = messages.quickNotes

/** Card gradients. Keys are stored on the account (`color`). */
export const ACCOUNT_COLORS: Record<string, [string, string]> = {
  violet: ['#7c3aed', '#c026d3'],
  sky: ['#0284c7', '#6366f1'],
  emerald: ['#059669', '#0d9488'],
  amber: ['#d97706', '#e11d48'],
  rose: ['#e11d48', '#9333ea'],
  slate: ['#334155', '#0f172a'],
  lime: ['#65a30d', '#0891b2'],
  gold: ['#b45309', '#a16207'],
}

export function accountGradient(color: string | null | undefined): string {
  const [a, b] = ACCOUNT_COLORS[color ?? ''] ?? ACCOUNT_COLORS.violet!
  return `linear-gradient(135deg, ${a}, ${b})`
}

export function accountAccent(color: string | null | undefined): string {
  return (ACCOUNT_COLORS[color ?? ''] ?? ACCOUNT_COLORS.violet!)[0]
}
