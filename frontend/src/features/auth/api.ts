import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<{ authenticated: boolean }>('/auth/me'),
    retry: false,
    staleTime: Infinity,
  })
}
