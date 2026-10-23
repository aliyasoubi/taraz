import type { Transaction } from '@/shared/api/types'
import { faDigits, formatMoney, UNIT_LABEL, type Unit } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { formatJ } from '@/shared/lib/jalali'
import { METHOD_LABEL, TX_LABEL } from '@/shared/lib/labels'

/** Plain-text receipt for pasting into a chat with the patient. */
export function receiptText(tx: Transaction, unit: Unit): string {
  const lines = [
    t('receipt.title', { type: TX_LABEL[tx.type] }),
    t('receipt.patient', { v: tx.patient_name }),
    t('receipt.amount', { v: `${formatMoney(tx.amount, unit)} ${UNIT_LABEL[unit]}` }),
  ]
  if (tx.type === 'payment') {
    lines.push(t('receipt.payer', { v: tx.payer_name ?? tx.patient_name }))
    if (tx.account_title)
      lines.push(t('receipt.paidTo', { v: `${tx.account_title}${tx.account_bank ? ` (${tx.account_bank})` : ''}` }))
  }
  if (tx.method) lines.push(t('receipt.method', { v: METHOD_LABEL[tx.method] }))
  lines.push(t('receipt.date', { v: formatJ(tx.occurred_on) }))
  if (tx.cheque_due_on) lines.push(t('receipt.chequeDue', { v: formatJ(tx.cheque_due_on) }))
  if (tx.reference) lines.push(t('receipt.reference', { v: faDigits(tx.reference) }))
  if (tx.description) lines.push(t('receipt.description', { v: tx.description }))
  return lines.join('\n')
}
