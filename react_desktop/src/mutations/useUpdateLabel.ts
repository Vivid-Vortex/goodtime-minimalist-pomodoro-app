import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabels, saveLabels } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import type { Label } from '../types/label'

export function useUpdateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Label> }) => {
      const updated = getLabels().map((l) => (l.id === id ? { ...l, ...patch } : l))
      saveLabels(updated)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labels.all }),
  })
}
