import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => getSettings(),
    staleTime: Infinity,
  })
}
