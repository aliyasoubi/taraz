import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/api/types'
import { balanceEffect, buildLedger } from './ledger'

let nextId = 1
function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: nextId++,
    patient_id: 1,
    patient_name: 'P',
    treatment_id: null,
    treatment_title: null,
    type: 'charge',
    amount: 100,
    occurred_on: '2026-10-01',
    description: null,
    doctor: null,
    payer_name: null,
    account_id: null,
    account_title: null,
    account_bank: null,
    account_color: null,
    method: null,
    reference: null,
    cheque_due_on: null,
    cheque_status: null,
    counts: true,
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('balanceEffect', () => {
  it('raises the debt for charges and refunds, lowers it for payments and discounts', () => {
    expect(balanceEffect(tx({ type: 'charge', amount: 5 }))).toBe(5)
    expect(balanceEffect(tx({ type: 'refund', amount: 5 }))).toBe(5)
    expect(balanceEffect(tx({ type: 'payment', amount: 5 }))).toBe(-5)
    expect(balanceEffect(tx({ type: 'discount', amount: 5 }))).toBe(-5)
  })

  it('ignores a cheque that has not cleared', () => {
    expect(balanceEffect(tx({ type: 'payment', method: 'cheque', counts: false }))).toBe(0)
  })
})

describe('buildLedger', () => {
  it('keeps a running balance in date order and groups by Jalali month, newest first', () => {
    // API order: newest first. Mehr 1405 ends 2026-10-22; Aban starts 2026-10-23.
    const payment = tx({ type: 'payment', amount: 30, occurred_on: '2026-10-25' })
    const charge2 = tx({ type: 'charge', amount: 50, occurred_on: '2026-10-05' })
    const charge1 = tx({ type: 'charge', amount: 100, occurred_on: '2026-09-25' })
    const ledger = buildLedger([payment, charge2, charge1])

    expect(ledger.runningBalance.get(charge1.id)).toBe(100)
    expect(ledger.runningBalance.get(charge2.id)).toBe(150)
    expect(ledger.runningBalance.get(payment.id)).toBe(120)
    expect(ledger.months.map((m) => [m.jm, m.net])).toEqual([
      [8, -30],
      [7, 150],
    ])
  })

  it('limits rows and balances to one treatment case', () => {
    const implant = tx({ treatment_id: 7, amount: 900 })
    const general = tx({ amount: 100 })
    const ledger = buildLedger([implant, general], 7)
    expect(ledger.months[0]?.items).toEqual([implant])
    expect(ledger.runningBalance.has(general.id)).toBe(false)
  })
})
