import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setTimesheetFields } from '../lib/firestore'
import { getSessions } from '../lib/localStorage'
import { buildFieldPatch } from '../lib/tagMapping'
import { queryKeys } from '../queryKeys'

interface PushResult {
  pushed: string[]   // dates pushed
  errors: string[]   // error messages
  unknownTags: string[]
}

export function usePushToCloud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<PushResult> => {
      const sessions = getSessions()
      if (sessions.length === 0) return { pushed: [], errors: [], unknownTags: [] }

      // Group sessions by date, then by label — sum minutes
      const byDate = new Map<string, Map<string, number>>()
      for (const s of sessions) {
        const dateMap = byDate.get(s.date) ?? new Map<string, number>()
        dateMap.set(s.labelName, (dateMap.get(s.labelName) ?? 0) + s.durationMinutes)
        byDate.set(s.date, dateMap)
      }

      const pushed: string[] = []
      const errors: string[] = []
      const allUnknown = new Set<string>()

      for (const [date, tagMinutes] of byDate.entries()) {
        const { patch, unknown } = buildFieldPatch(Object.fromEntries(tagMinutes))
        unknown.forEach((t) => allUnknown.add(t))

        if (Object.keys(patch).length === 0) continue

        try {
          await setTimesheetFields(date, patch as Record<string, number>)
          pushed.push(date)
          qc.invalidateQueries({ queryKey: queryKeys.cloud.timesheetEntry(date) })
        } catch (err) {
          errors.push(`${date}: ${String(err)}`)
        }
      }

      return { pushed, errors, unknownTags: Array.from(allUnknown) }
    },
  })
}
