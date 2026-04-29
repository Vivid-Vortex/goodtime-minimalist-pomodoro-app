import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabels, saveLabels } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'

export function useDeleteLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      saveLabels(getLabels().filter((l) => l.id !== id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labels.all }),
  })
}
