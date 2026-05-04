import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertTimesheetEntry } from '../lib/firestore'
import { getSessions, markSessionsSynced } from '../lib/localStorage'
import { buildFieldPatch } from '../lib/tagMapping'
import { queryKeys } from '../queryKeys'

interface PushResult {
  pushed: string[]
  errors: string[]
  unknownTags: string[]
}

export function usePushToCloud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<PushResult> => {
      const allSessions = getSessions()
      // Only push sessions not yet synced to cloud.
      // synced===false → new session; synced===undefined → legacy (treat as already synced).
      const unsynced = allSessions.filter((s) => s.synced === false)
      if (unsynced.length === 0) return { pushed: [], errors: [], unknownTags: [] }

      // Group unsynced (delta) sessions by date, then by label — sum minutes
      const byDate = new Map<string, Map<string, number>>()
      for (const s of unsynced) {
        const dateMap = byDate.get(s.date) ?? new Map<string, number>()
        dateMap.set(s.labelName, (dateMap.get(s.labelName) ?? 0) + s.durationMinutes)
        byDate.set(s.date, dateMap)
      }

      const pushed: string[] = []
      const errors: string[] = []
      const allUnknown = new Set<string>()
      const syncedIds: string[] = []

      for (const [date, tagMinutes] of byDate.entries()) {
        const { patch, unknown } = buildFieldPatch(Object.fromEntries(tagMinutes))
        unknown.forEach((t) => allUnknown.add(t))

        if (Object.keys(patch).length === 0) continue

        try {
          // Additively merge delta into cloud so other devices' data is preserved
          await upsertTimesheetEntry(date, patch as Record<string, number>)
          pushed.push(date)
          qc.invalidateQueries({ queryKey: queryKeys.cloud.timesheetEntry(date) })
          // Collect IDs of sessions successfully pushed for this date
          unsynced.filter((s) => s.date === date).forEach((s) => syncedIds.push(s.id))
        } catch (err) {
          errors.push(`${date}: ${String(err)}`)
        }
      }

      if (syncedIds.length > 0) {
        markSessionsSynced(syncedIds)
      }

      return { pushed, errors, unknownTags: Array.from(allUnknown) }
    },
  })
}
