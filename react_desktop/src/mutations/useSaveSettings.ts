import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSettings } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import type { AppSettings } from '../types/settings'

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (settings: AppSettings) => {
      saveSettings(settings)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.all }),
  })
}
