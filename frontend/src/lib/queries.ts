import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from './api'
import type {
  Account,
  Dashboard,
  MonthlyReport,
  Patient,
  PatientDetail,
  Suggestions,
  Transaction,
  TransactionInput,
  TransactionPage,
  Treatment,
} from './types'

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

// ── Reads ────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<{ authenticated: boolean }>('/auth/me'),
    retry: false,
    staleTime: Infinity,
  })
}

export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>('/dashboard') })
}

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

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: keys.monthly(year, month),
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly${qs({ year, month })}`),
    placeholderData: keepPreviousData,
  })
}

export function useSuggestions() {
  return useQuery({
    queryKey: keys.suggestions,
    queryFn: () => api.get<Suggestions>('/suggestions'),
    staleTime: 60_000,
  })
}

// ── Writes ───────────────────────────────────────────────────────────────

/** Any money movement can change every total on every screen; refetch them all. */
function useInvalidateLedger() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['dashboard', 'patients', 'patient', 'accounts', 'transactions', 'reports', 'suggestions'].map(
        (k) => qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export function useSaveTransaction() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<TransactionInput> }) =>
      id
        ? api.patch<Transaction>(`/transactions/${id}`, data)
        : api.post<Transaction>('/transactions', data),
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

export type TreatmentInput = Pick<Treatment, 'title' | 'kind' | 'doctor' | 'status' | 'note'>

export function useSaveTreatment(patientId: number) {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<TreatmentInput> }) =>
      id
        ? api.patch<Treatment>(`/treatments/${id}`, data)
        : api.post<Treatment>(`/patients/${patientId}/treatments`, data),
    onSuccess: invalidate,
  })
}

export function useDeleteTreatment() {
  const invalidate = useInvalidateLedger()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/treatments/${id}`),
    onSuccess: invalidate,
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
