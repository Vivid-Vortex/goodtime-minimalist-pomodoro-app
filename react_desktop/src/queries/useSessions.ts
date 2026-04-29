import { useQuery } from '@tanstack/react-query'
import { getSessions, getSessionsByDate } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => getSessions(),
    staleTime: 0,
  })
}

export function useSessionsByDate(date: string) {
  return useQuery({
    queryKey: queryKeys.sessions.byDate(date),
    queryFn: () => getSessionsByDate(date),
    staleTime: 0,
  })
}
