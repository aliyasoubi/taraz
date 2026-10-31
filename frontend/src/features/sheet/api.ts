import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/shared/api/client'
import { keys } from '@/shared/api/keys'
import type { MonthSheet } from '@/shared/api/types'

export function useMonthSheet(year: number, month: number) {
  return useQuery({
    queryKey: keys.monthSheet(year, month),
    queryFn: () => api.get<MonthSheet>(`/reports/month-sheet${qs({ year, month })}`),
    placeholderData: keepPreviousData,
  })
}
