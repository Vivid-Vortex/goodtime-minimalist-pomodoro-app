/** Format epoch ms → "dd-mm-yyyy" (Firestore document ID format) */
export function formatDateId(epochMs: number): string {
  const d = new Date(epochMs)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

/** Today's date as "dd-mm-yyyy" */
export function todayId(): string {
  return formatDateId(Date.now())
}

/** Parse "dd-mm-yyyy" → epoch ms (midnight local time) */
export function parseDateId(id: string): number {
  const [dd, mm, yyyy] = id.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}

/** Format epoch ms → "dd-mm-yyyy" display string */
export function formatDisplay(epochMs: number): string {
  return formatDateId(epochMs)
}

/** Get the start-of-day epoch ms for today */
export function todayEpoch(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Format mm:ss from milliseconds */
export function formatMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
