import { describe, expect, it } from 'vitest'
import type { SheetRow } from '@/shared/api/types'
import { rowsFor, sheetDays, sheetTotals } from './sheet'

let nextId = 1
function row(partial: Partial<SheetRow>): SheetRow {
  return {
    id: nextId++,
    patient_id: 1,
    patient_name: 'P',
    treatment_id: null,
    treatment_title: null,
    type: 'payment',
    amount: 100,
    occurred_on: '2026-10-23',
    description: null,
    doctor: null,
    payer_name: null,
    account_id: null,
    account_title: null,
    account_bank: null,
    account_color: null,
    method: 'card',
    reference: null,
    cheque_due_on: null,
    cheque_status: null,
    counts: true,
    created_at: '',
    updated_at: '',
    balance_after: 0,
    ...partial,
  }
}

describe('month sheet', () => {
  it('groups by day, newest first, keeping entry order within a day', () => {
    const a = row({ occurred_on: '2026-10-23' })
    const b = row({ occurred_on: '2026-10-25' })
    const c = row({ occurred_on: '2026-10-23' })
    expect(sheetDays([a, b, c]).map((d) => [d.date, d.rows.map((r) => r.id)])).toEqual([
      ['2026-10-25', [b.id]],
      ['2026-10-23', [a.id, c.id]],
    ])
  })

  it('filters to one account and totals what was received and charged', () => {
    const rows = [
      row({ account_id: 1, amount: 300 }),
      row({ account_id: 2, amount: 50 }),
      row({ type: 'charge', amount: 1000 }),
      row({ account_id: 1, amount: 70, counts: false }), // a pending cheque is not money in yet
    ]
    expect(rowsFor(rows, 1).map((r) => r.amount)).toEqual([300, 70])
    expect(sheetTotals(rows)).toEqual({ received: 350, charged: 1000 })
  })
})
