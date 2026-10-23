import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/api/types'
import { t } from '@/shared/lib/i18n'
import { receiptText } from './receipt'

const payment: Transaction = {
  id: 1,
  patient_id: 1,
  patient_name: 'Ali',
  treatment_id: null,
  treatment_title: null,
  type: 'payment',
  amount: 1_500,
  occurred_on: '2026-10-23',
  description: null,
  payer_name: 'Mohammad',
  account_id: 2,
  account_title: 'Mr. Ghomi',
  account_bank: 'Saman',
  account_color: null,
  method: 'card',
  reference: null,
  cheque_due_on: null,
  cheque_status: null,
  counts: true,
  created_at: '',
  updated_at: '',
}

describe('receiptText', () => {
  it('names who paid and the account it went to', () => {
    const lines = receiptText(payment, 'rial').split('\n')
    expect(lines).toContain(t('receipt.patient', { v: 'Ali' }))
    expect(lines).toContain(t('receipt.payer', { v: 'Mohammad' }))
    expect(lines).toContain(t('receipt.paidTo', { v: 'Mr. Ghomi (Saman)' }))
  })

  it('leaves out payment lines for a charge', () => {
    const text = receiptText(
      { ...payment, type: 'charge', method: null, payer_name: null, account_title: null },
      'rial',
    )
    expect(text).not.toContain(t('receipt.payer', { v: 'Ali' }))
  })
})
