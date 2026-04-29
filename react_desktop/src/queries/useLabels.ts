import { useQuery } from '@tanstack/react-query'
import { getLabels } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

export function useLabels() {
  return useQuery({
    queryKey: queryKeys.labels.all,
    queryFn: () => getLabels(),
    staleTime: Infinity,
  })
}
