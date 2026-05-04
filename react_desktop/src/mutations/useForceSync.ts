import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setTimesheetFields } from '../lib/firestore'
import { getSessions, markSessionsSynced } from '../lib/localStorage'
import { buildFieldPatch } from '../lib/tagMapping'
import { queryKeys } from '../queryKeys'

interface ForceSyncResult {
  pushed: string[]
  errors: string[]
}

/** Replace cloud values with the current local totals for every date. */
export function useForceSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<ForceSyncResult> => {
      const allSessions = getSessions()
      if (allSessions.length === 0) return { pushed: [], errors: [] }

      const byDate = new Map<string, Map<string, number>>()
      for (const s of allSessions) {
        const dateMap = byDate.get(s.date) ?? new Map<string, number>()
        dateMap.set(s.labelName, (dateMap.get(s.labelName) ?? 0) + s.durationMinutes)
        byDate.set(s.date, dateMap)
      }

      const pushed: string[] = []
      const errors: string[] = []

      for (const [date, tagMinutes] of byDate.entries()) {
        const { patch } = buildFieldPatch(Object.fromEntries(tagMinutes))
        if (Object.keys(patch).length === 0) continue
        try {
          await setTimesheetFields(date, patch as Record<string, number>)
          pushed.push(date)
          qc.invalidateQueries({ queryKey: queryKeys.cloud.timesheetEntry(date) })
        } catch (err) {
          errors.push(`${date}: ${String(err)}`)
        }
      }

      if (pushed.length > 0) {
        markSessionsSynced(allSessions.map((s) => s.id))
      }

      return { pushed, errors }
    },
  })
}
