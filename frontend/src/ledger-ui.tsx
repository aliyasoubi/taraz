import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { TxDetailSheet } from './components/TxDetailSheet'
import { TxFormSheet, type TxPreset } from './components/TxFormSheet'
import type { Transaction } from './lib/types'

interface LedgerUI {
  newTransaction: (preset?: TxPreset) => void
  editTransaction: (tx: Transaction) => void
  openTransaction: (tx: Transaction) => void
}

const Ctx = createContext<LedgerUI | null>(null)

/** The transaction sheets live once at the root, so any screen (and the tab bar) can open them. */
export function LedgerUIProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<{ open: boolean; preset?: TxPreset; tx?: Transaction; key: number }>({
    open: false,
    key: 0,
  })
  const [detail, setDetail] = useState<Transaction | null>(null)

  const newTransaction = useCallback(
    (preset?: TxPreset) => setForm((f) => ({ open: true, preset, tx: undefined, key: f.key + 1 })),
    [],
  )
  const editTransaction = useCallback((tx: Transaction) => {
    setDetail(null)
    setForm((f) => ({ open: true, preset: undefined, tx, key: f.key + 1 }))
  }, [])
  const openTransaction = useCallback((tx: Transaction) => setDetail(tx), [])

  const value = useMemo(
    () => ({ newTransaction, editTransaction, openTransaction }),
    [newTransaction, editTransaction, openTransaction],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <TxFormSheet
        key={form.key}
        open={form.open}
        preset={form.preset}
        editing={form.tx}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={(tx) => setDetail(tx)}
      />
      <TxDetailSheet tx={detail} onClose={() => setDetail(null)} onEdit={editTransaction} />
    </Ctx.Provider>
  )
}

export function useLedgerUI(): LedgerUI {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLedgerUI outside LedgerUIProvider')
  return ctx
}
