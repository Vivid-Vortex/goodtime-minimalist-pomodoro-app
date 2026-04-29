import { useQuery } from '@tanstack/react-query'
import { getTimerProfiles } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

export function useTimerProfiles() {
  return useQuery({
    queryKey: queryKeys.timerProfiles.all,
    queryFn: () => getTimerProfiles(),
    staleTime: Infinity,
  })
}
