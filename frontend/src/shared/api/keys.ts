// Query keys, and the one invalidation every ledger write needs.
import { useQueryClient } from '@tanstack/react-query'

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  patients: (params: object) => ['patients', params] as const,
  patient: (id: number) => ['patient', id] as const,
  patientTxs: (id: number) => ['patient', id, 'transactions'] as const,
  accounts: ['accounts'] as const,
  account: (id: number) => ['accounts', id] as const,
  transactions: (params: object) => ['transactions', params] as const,
  monthly: (y: number, m: number) => ['reports', 'monthly', y, m] as const,
  suggestions: ['suggestions'] as const,
}

export function useInvalidateLedger() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['dashboard', 'patients', 'patient', 'accounts', 'transactions', 'reports', 'suggestions'].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}
