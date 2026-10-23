import type { AccountKind, ChequeStatus, PaymentMethod, TreatmentKind, TxType } from './types'

export const TX_LABEL: Record<TxType, string> = {
  charge: 'هزینه درمان',
  payment: 'پرداخت',
  discount: 'تخفیف',
  refund: 'استرداد',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'کارت به کارت',
  transfer: 'انتقال بانکی',
  pos: 'کارتخوان',
  cash: 'نقد',
  cheque: 'چک',
  currency: 'ارز',
  other: 'سایر',
}

export const CHEQUE_LABEL: Record<ChequeStatus, string> = {
  pending: 'در انتظار وصول',
  cleared: 'وصول شد',
  bounced: 'برگشتی',
}

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  own: 'حساب خودم',
  staff: 'همکار / منشی',
  third_party: 'شخص ثالث',
  pos: 'کارتخوان',
  cash: 'صندوق نقدی',
  other: 'سایر',
}

export const TREATMENT_LABEL: Record<TreatmentKind, string> = {
  general: 'عمومی',
  implant: 'ایمپلنت',
  ortho: 'ارتودنسی',
  laminate: 'لمینت',
  composite: 'کامپوزیت',
  endo: 'عصب‌کشی',
  surgery: 'جراحی',
  prosthesis: 'پروتز',
  cosmetic: 'زیبایی',
  other: 'سایر',
}

export const BANKS = [
  'ملت',
  'ملی',
  'تجارت',
  'صادرات',
  'سپه',
  'کارآفرین',
  'بلو',
  'پاسارگاد',
  'پارسیان',
  'رسالت',
  'ایران‌زمین',
  'سامان',
  'آینده',
  'اقتصاد نوین',
  'ویپاد',
  'مسکن',
  'رفاه',
  'شهر',
]

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
