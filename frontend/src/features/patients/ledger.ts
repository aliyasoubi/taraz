import { isoToJ, monthKey } from '@/shared/lib/jalali'
import type { Transaction } from '@/shared/api/types'

export type CaseFilter = number | 'all'

export interface LedgerMonth {
  key: string
  jy: number
  jm: number
  items: Transaction[]
  /** How much this month moved the balance. */
  net: number
}

export interface Ledger {
  /** Balance right after each row, like the spreadsheet's hand-kept balance column. */
  runningBalance: Map<number, number>
  /** Newest month first, rows in the order given (the API sends newest first). */
  months: LedgerMonth[]
}

/** A row's effect on what the patient owes. Pending or bounced cheques move nothing. */
export function balanceEffect(tx: Transaction): number {
  if (!tx.counts) return 0
  return tx.type === 'charge' || tx.type === 'refund' ? tx.amount : -tx.amount
}

export function buildLedger(transactions: Transaction[], filter: CaseFilter = 'all'): Ledger {
  const rows = transactions.filter((tx) => filter === 'all' || tx.treatment_id === filter)

  const chronological = [...rows].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id - b.id)
  const runningBalance = new Map<number, number>()
  let balance = 0
  for (const tx of chronological) {
    balance += balanceEffect(tx)
    runningBalance.set(tx.id, balance)
  }

  const byMonth = new Map<string, LedgerMonth>()
  for (const tx of rows) {
    const key = monthKey(tx.occurred_on)
    let month = byMonth.get(key)
    if (!month) {
      const { jy, jm } = isoToJ(tx.occurred_on)
      month = { key, jy, jm, items: [], net: 0 }
      byMonth.set(key, month)
    }
    month.items.push(tx)
    month.net += balanceEffect(tx)
  }
  return { runningBalance, months: [...byMonth.values()] }
}
