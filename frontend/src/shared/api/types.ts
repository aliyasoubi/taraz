// Mirrors backend/app/schemas.py. Amounts are integer rials; dates are ISO (Gregorian).

export type TxType = 'charge' | 'payment' | 'discount' | 'refund'
export type PaymentMethod = 'card' | 'transfer' | 'pos' | 'cash' | 'cheque' | 'currency' | 'other'
export type ChequeStatus = 'pending' | 'cleared' | 'bounced'
export type AccountKind = 'own' | 'staff' | 'third_party' | 'pos' | 'cash' | 'other'
export type TreatmentKind =
  'general' | 'implant' | 'ortho' | 'laminate' | 'composite' | 'endo' | 'surgery' | 'prosthesis' | 'cosmetic' | 'other'
export type TreatmentStatus = 'active' | 'completed'

export interface BalanceFields {
  balance: number
  charged: number
  paid: number
  discounted: number
  pending_cheques: number
  last_activity: string | null
  tx_count: number
}

export interface Patient extends BalanceFields {
  id: number
  name: string
  phone: string | null
  note: string | null
  is_archived: boolean
  created_at: string
}

export interface Treatment extends BalanceFields {
  id: number
  patient_id: number
  title: string
  kind: TreatmentKind
  doctor: string | null
  status: TreatmentStatus
  note: string | null
  created_at: string
}

export interface PatientDetail extends Patient {
  treatments: Treatment[]
}

export interface Account {
  id: number
  title: string
  owner_name: string | null
  bank: string | null
  kind: AccountKind
  card_last4: string | null
  color: string
  note: string | null
  is_archived: boolean
  received_total: number
  received_this_month: number
  pending_cheques: number
  tx_count: number
  last_received_on: string | null
}

export interface Transaction {
  id: number
  patient_id: number
  patient_name: string
  treatment_id: number | null
  treatment_title: string | null
  type: TxType
  amount: number
  occurred_on: string
  description: string | null
  payer_name: string | null
  account_id: number | null
  account_title: string | null
  account_bank: string | null
  account_color: string | null
  method: PaymentMethod | null
  reference: string | null
  cheque_due_on: string | null
  cheque_status: ChequeStatus | null
  counts: boolean
  created_at: string
  updated_at: string
}

export interface TransactionInput {
  patient_id: number
  treatment_id: number | null
  type: TxType
  amount: number
  occurred_on: string
  description: string | null
  payer_name: string | null
  account_id: number | null
  method: PaymentMethod | null
  reference: string | null
  cheque_due_on: string | null
  cheque_status: ChequeStatus | null
}

export interface TransactionPage {
  items: Transaction[]
  total: number
  sum_amount: number
}

export interface MonthRef {
  year: number
  month: number
  label: string
  start: string
  end: string
}

export interface SeriesPoint {
  year: number
  month: number
  label: string
  received: number
  charged: number
}

export interface DebtorRow {
  id: number
  name: string
  balance: number
  pending_cheques: number
  last_activity: string | null
}

export interface Dashboard {
  month: MonthRef
  receivable: number
  credit: number
  debtors_count: number
  patients_count: number
  received_this_month: number
  charged_this_month: number
  received_today: number
  pending_cheques_total: number
  pending_cheques_count: number
  series: SeriesPoint[]
  top_debtors: DebtorRow[]
  upcoming_cheques: Transaction[]
  recent: Transaction[]
}

export interface StatementRow {
  id: number
  name: string
  opening: number
  charged: number
  paid: number
  discounted: number
  refunded: number
  closing: number
  pending_cheques: number
}

export interface BreakdownRow {
  key: string
  label: string
  amount: number
  count: number
  color: string | null
}

export interface MonthlyReport {
  month: MonthRef
  opening_receivable: number
  closing_receivable: number
  closing_credit: number
  charged: number
  paid: number
  discounted: number
  refunded: number
  debtors_count: number
  by_account: BreakdownRow[]
  by_method: BreakdownRow[]
  rows: StatementRow[]
  cheques_due: Transaction[]
}

export interface Suggestions {
  payers: string[]
  doctors: string[]
}
