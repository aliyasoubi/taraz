// The transaction form's state and rules, free of React so they can be unit-tested.
import type { ChequeStatus, PaymentMethod, Transaction, TransactionInput, TxType } from '@/shared/api/types'

export interface TxPreset {
  patientId?: number
  type?: TxType
  treatmentId?: number
}

export interface TxFormState {
  type: TxType
  patientId: number | null
  treatmentId: number | null
  amount: number | null
  occurredOn: string
  description: string
  payerIsSomeoneElse: boolean
  payerName: string
  accountId: number | null
  method: PaymentMethod
  reference: string
  chequeDueOn: string
  chequeStatus: ChequeStatus
}

export const METHODS: PaymentMethod[] = ['card', 'pos', 'transfer', 'cash', 'cheque', 'currency', 'other']

export function initialFormState(opts: {
  preset?: TxPreset
  editing?: Transaction
  lastAccountId: number | null
  today: string
}): TxFormState {
  const { preset, editing, lastAccountId, today } = opts
  return {
    type: editing?.type ?? preset?.type ?? 'payment',
    patientId: editing?.patient_id ?? preset?.patientId ?? null,
    treatmentId: editing?.treatment_id ?? preset?.treatmentId ?? null,
    amount: editing?.amount ?? null,
    occurredOn: editing?.occurred_on ?? today,
    description: editing?.description ?? '',
    payerIsSomeoneElse: Boolean(editing?.payer_name),
    payerName: editing?.payer_name ?? '',
    accountId: editing ? editing.account_id : lastAccountId,
    method: editing?.method ?? 'card',
    reference: editing?.reference ?? '',
    chequeDueOn: editing?.cheque_due_on ?? '',
    chequeStatus: editing?.cheque_status ?? 'pending',
  }
}

/** Payments and refunds move money between a person and an account; charges and discounts don't. */
export function movesMoney(type: TxType): boolean {
  return type === 'payment' || type === 'refund'
}

export function isCheque(form: Pick<TxFormState, 'type' | 'method'>): boolean {
  return form.type === 'payment' && form.method === 'cheque'
}

/** Methods offered for a type: only an incoming payment can be a cheque. */
export function methodsFor(type: TxType): PaymentMethod[] {
  return METHODS.filter((m) => type === 'payment' || m !== 'cheque')
}

export function canSubmit(form: TxFormState): boolean {
  return Boolean(
    form.patientId && form.amount && form.amount > 0 && form.occurredOn && (!isCheque(form) || form.chequeDueOn),
  )
}

/** The API body. Fields that don't apply to the type are sent as null. */
export function toPayload(form: TxFormState): TransactionInput {
  if (!form.patientId || !form.amount) throw new Error('toPayload called on an incomplete form')
  const money = movesMoney(form.type)
  const cheque = isCheque(form)
  return {
    patient_id: form.patientId,
    treatment_id: form.treatmentId,
    type: form.type,
    amount: form.amount,
    occurred_on: form.occurredOn,
    description: form.description.trim() || null,
    payer_name: form.type === 'payment' && form.payerIsSomeoneElse ? form.payerName.trim() || null : null,
    account_id: money ? form.accountId : null,
    method: money ? form.method : null,
    reference: money ? form.reference.trim() || null : null,
    cheque_due_on: cheque ? form.chequeDueOn : null,
    cheque_status: cheque ? form.chequeStatus : null,
  }
}
