import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { Dashboard } from '@/shared/api/types'

export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>('/dashboard') })
}
