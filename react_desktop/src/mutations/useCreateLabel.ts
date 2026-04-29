import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabels, saveLabels } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import type { Label } from '../types/label'

export function useCreateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: Omit<Label, 'id' | 'createdAt' | 'order'>) => {
      const existing = getLabels()
      const newLabel: Label = {
        ...label,
        id: crypto.randomUUID(),
        order: existing.length,
        createdAt: Date.now(),
      }
      saveLabels([...existing, newLabel])
      return newLabel
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labels.all }),
  })
}
