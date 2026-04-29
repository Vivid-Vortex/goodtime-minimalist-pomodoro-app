export interface Session {
  id: string
  labelName: string     // tag abbreviation, e.g. "W1M"
  date: string          // "dd-mm-yyyy"
  durationMinutes: number
  startedAt: number     // epoch ms
  endedAt: number       // epoch ms
}

export interface AppHistoryEntry {
  id: string
  labelName: string
  date: string
  durationMinutes: number
  startedAt: number
  endedAt: number
  deviceName: string
  syncedToCloud?: boolean
  syncedFromDevice?: string
}
