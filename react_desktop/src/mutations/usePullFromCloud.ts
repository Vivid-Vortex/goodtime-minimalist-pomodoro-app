import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getTimesheetEntry } from '../lib/firestore'
import { queryKeys } from '../queryKeys'
import type { TimesheetEntry } from '../types/firestore'

interface PullResult {
  entries: TimesheetEntry[]
  errors: string[]
}

export function usePullFromCloud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dateIds: string[]): Promise<PullResult> => {
      const entries: TimesheetEntry[] = []
      const errors: string[] = []

      await Promise.all(
        dateIds.map(async (id) => {
          try {
            const entry = await getTimesheetEntry(id)
            if (entry) {
              entries.push(entry)
              qc.setQueryData(queryKeys.cloud.timesheetEntry(id), entry)
            }
          } catch (err) {
            errors.push(`${id}: ${String(err)}`)
          }
        })
      )

      return { entries, errors }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.statistics.overview() })
    },
  })
}
