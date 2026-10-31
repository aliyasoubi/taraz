import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/shared/api/client'
import { keys, useInvalidateLedger } from '@/shared/api/keys'
import type { Patient, PatientDetail, Transaction } from '@/shared/api/types'

export interface PatientListParams {
  q?: string
  status?: 'all' | 'debtor' | 'creditor' | 'settled' | 'archived'
  sort?: 'balance' | 'name' | 'recent'
}

export function usePatients(params: PatientListParams) {
  return useQuery({
    queryKey: keys.patients(params),
    queryFn: () => api.get<Patient[]>(`/patients${qs({ ...params })}`),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: keys.patient(id),
    queryFn: () => api.get<PatientDetail>(`/patients/${id}`),
    enabled: Number.isFinite(id),
  })
}

export function usePatientTransactions(id: number) {
  return useQuery({
    queryKey: keys.patientTxs(id),
    queryFn: () => api.get<Transaction[]>(`/patients/${id}/transactions`),
    enabled: Number.isFinite(id),
  })
}

export type PatientInput = { name: string; phone: string | null; note: string | null; is_archived?: boolean }

export function useSavePatient() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<PatientInput> }) =>
      id ? api.patch<PatientDetail>(`/patients/${id}`, data) : api.post<PatientDetail>('/patients', data),
    onSuccess: invalidate,
  })
}

export function useDeletePatient() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/patients/${id}`),
    onSuccess: invalidate,
  })
}
