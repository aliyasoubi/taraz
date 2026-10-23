import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { MonthlyReport } from '@/shared/api/types'

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: keys.monthly(year, month),
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly${qs({ year, month })}`),
    placeholderData: keepPreviousData,
  })
}
