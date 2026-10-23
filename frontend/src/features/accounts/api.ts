import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { keys, useInvalidateLedger } from '@/shared/api/keys'
import type { Account } from '@/shared/api/types'

export function useAccounts() {
  return useQuery({ queryKey: keys.accounts, queryFn: () => api.get<Account[]>('/accounts') })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: keys.account(id),
    queryFn: () => api.get<Account>(`/accounts/${id}`),
    enabled: Number.isFinite(id),
  })
}

export type AccountInput = Pick<Account, 'title' | 'owner_name' | 'bank' | 'kind' | 'card_last4' | 'color' | 'note'> & {
  is_archived?: boolean
}

export function useSaveAccount() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<AccountInput> }) =>
      id ? api.patch<Account>(`/accounts/${id}`, data) : api.post<Account>('/accounts', data),
    onSuccess: invalidate,
  })
}

export function useDeleteAccount() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: invalidate,
  })
}
