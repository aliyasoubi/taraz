// The month sheet's grouping and totals, free of React so they can be unit-tested.
import type { SheetRow } from '@/shared/api/types'

export interface SheetDay {
  date: string
  rows: SheetRow[]
}

/** Only the payments that went to one account; every row when none is chosen. */
export function rowsFor(rows: SheetRow[], accountId: number | null): SheetRow[] {
  return accountId === null ? rows : rows.filter((r) => r.type === 'payment' && r.account_id === accountId)
}

/** Newest day first; within a day, rows in the order they were entered. */
export function sheetDays(rows: SheetRow[]): SheetDay[] {
  const days = new Map<string, SheetRow[]>()
  for (const row of rows) {
    const day = days.get(row.occurred_on)
    if (day) day.push(row)
    else days.set(row.occurred_on, [row])
  }
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, dayRows]) => ({ date, rows: dayRows }))
}

export function sheetTotals(rows: SheetRow[]): { received: number; charged: number } {
  let received = 0
  let charged = 0
  for (const r of rows) {
    if (r.type === 'payment' && r.counts) received += r.amount
    if (r.type === 'charge') charged += r.amount
  }
  return { received, charged }
}
