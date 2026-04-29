import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllTimesheetEntries } from '../lib/firestore'
import { saveCloudStats } from '../lib/localStorage'
import { queryKeys } from '../queryKeys'
import { TAG_TO_FIELD } from '../lib/tagMapping'
import { parseDateId } from '../lib/dateUtils'
import type { Session } from '../types/session'
import type { TimesheetEntry } from '../types/firestore'

function entriesToSessions(entries: TimesheetEntry[]): Session[] {
  const sessions: Session[] = []

  for (const entry of entries) {
    const { id: dateId, formData } = entry
    if (!formData?.tagSnapshot) continue

    const endedAt = parseDateId(dateId)

    // Build a reverse map: abbreviation → minutes
    // tagSnapshot: { work1Main: "W1M", essentials: "ESS", ... }
    // For each key in tagSnapshot, its value is the abbreviation.
    // TAG_TO_FIELD maps abbreviation → formData field name.
    for (const [, abbrev] of Object.entries(formData.tagSnapshot)) {
      const fieldName = TAG_TO_FIELD[abbrev]
      if (!fieldName) continue

      const raw = (formData as Record<string, unknown>)[fieldName]
      const minutes = typeof raw === 'number' ? raw : Number(raw) || 0
      if (minutes <= 0) continue

      sessions.push({
        id: `cloud-${dateId}-${abbrev}`,
        labelName: abbrev,
        date: dateId,
        durationMinutes: minutes,
        startedAt: endedAt,
        endedAt,
      })
    }
  }

  return sessions
}

export function useRefreshCloudStats() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const entries = await getAllTimesheetEntries()
      const sessions = entriesToSessions(entries)
      saveCloudStats(sessions)
      return sessions
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cloudStats.all })
    },
  })
}
