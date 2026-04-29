import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getTimerProfiles, saveTimerProfiles } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import type { TimerProfile } from '../types/settings'

export function useSaveTimerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (profile: TimerProfile) => {
      const all = getTimerProfiles()
      const idx = all.findIndex((p) => p.id === profile.id)
      if (idx >= 0) {
        all[idx] = profile
      } else {
        all.push(profile)
      }
      saveTimerProfiles(all)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.timerProfiles.all }),
  })
}

export function useDeleteTimerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      saveTimerProfiles(getTimerProfiles().filter((p) => p.id !== id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.timerProfiles.all }),
  })
}
