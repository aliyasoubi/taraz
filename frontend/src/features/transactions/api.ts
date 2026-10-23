import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/shared/api/client'
import { keys, useInvalidateLedger } from '@/shared/api/keys'
import type { Suggestions, Transaction, TransactionInput, TransactionPage } from '@/shared/api/types'

export interface TxListParams {
  patient_id?: number
  account_id?: number
  type?: string
  method?: string
  cheque_status?: string
  from?: string
  to?: string
  by_effective_date?: boolean
  limit?: number
}

export function useTransactions(params: TxListParams, enabled = true) {
  return useQuery({
    queryKey: keys.transactions(params),
    queryFn: () => api.get<TransactionPage>(`/transactions${qs({ ...params })}`),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useSuggestions() {
  return useQuery({
    queryKey: keys.suggestions,
    queryFn: () => api.get<Suggestions>('/suggestions'),
    staleTime: 60_000,
  })
}

export function useSaveTransaction() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<TransactionInput> }) =>
      id ? api.patch<Transaction>(`/transactions/${id}`, data) : api.post<Transaction>('/transactions', data),
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate,
  })
}
