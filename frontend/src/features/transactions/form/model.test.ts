import { describe, expect, it } from 'vitest'
import { canSubmit, initialFormState, methodsFor, toPayload, type TxFormState } from './model'

const base = (patch: Partial<TxFormState> = {}): TxFormState => ({
  ...initialFormState({ lastAccountId: 4, today: '2026-10-23' }),
  patientId: 1,
  amount: 1_000,
  ...patch,
})

describe('transaction form model', () => {
  it('starts as a payment today, into the last account used', () => {
    const form = initialFormState({ preset: { patientId: 9 }, lastAccountId: 4, today: '2026-10-23' })
    expect([form.type, form.patientId, form.accountId, form.occurredOn]).toEqual(['payment', 9, 4, '2026-10-23'])
  })

  it('needs a patient, an amount, and a due date for a cheque', () => {
    expect(canSubmit(base())).toBe(true)
    expect(canSubmit(base({ patientId: null }))).toBe(false)
    expect(canSubmit(base({ amount: 0 }))).toBe(false)
    expect(canSubmit(base({ method: 'cheque' }))).toBe(false)
    expect(canSubmit(base({ method: 'cheque', chequeDueOn: '2026-11-01' }))).toBe(true)
  })

  it('records who paid and where the money went', () => {
    const body = toPayload(base({ payerIsSomeoneElse: true, payerName: ' Mohammad ', accountId: 7 }))
    expect([body.payer_name, body.account_id, body.method]).toEqual(['Mohammad', 7, 'card'])
  })

  it('sends no payment details for a charge', () => {
    const body = toPayload(base({ type: 'charge', payerIsSomeoneElse: true, payerName: 'x', reference: '1' }))
    expect([body.payer_name, body.account_id, body.method, body.reference]).toEqual([null, null, null, null])
  })

  it('only offers cheques for incoming payments', () => {
    expect(methodsFor('payment')).toContain('cheque')
    expect(methodsFor('refund')).not.toContain('cheque')
  })
})
