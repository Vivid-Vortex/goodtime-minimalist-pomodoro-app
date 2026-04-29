import { useQuery } from '@tanstack/react-query'
import { getTimesheetEntry, getAppHistory } from '../lib/firestore'
import { queryKeys } from '../queryKeys'

export function useTimesheetEntry(dateId: string) {
  return useQuery({
    queryKey: queryKeys.cloud.timesheetEntry(dateId),
    queryFn: () => getTimesheetEntry(dateId),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(dateId),
  })
}

export function useCloudAppHistory(dateId: string) {
  return useQuery({
    queryKey: queryKeys.cloud.appHistory(dateId),
    queryFn: () => getAppHistory(dateId),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(dateId),
  })
}
