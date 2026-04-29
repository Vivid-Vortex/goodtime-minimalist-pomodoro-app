import { useQuery } from '@tanstack/react-query'
import { getCloudStats } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

/** Returns the last-fetched cloud stats snapshot (persisted in localStorage). */
export function useCloudStats() {
  return useQuery({
    queryKey: queryKeys.cloudStats.all,
    queryFn: getCloudStats,
    staleTime: Infinity,
  })
}
