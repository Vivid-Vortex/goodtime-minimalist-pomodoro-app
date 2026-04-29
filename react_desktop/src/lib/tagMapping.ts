import type { TagSnapshot, TimesheetFormData } from '../types/firestore'

/** Default tagSnapshot stored in every Firestore document */
export const DEFAULT_TAG_SNAPSHOT: TagSnapshot = {
  avdhanaMode: 'AV',
  wcmn: 'WCMN',
  work3: 'W3',
  work4: 'W4',
  work2: 'W2',
  work5: 'W5',
  ltg: 'LTG',
  timeWasted: 'TW',
  essentials: 'ESS',
  finance: 'FIN',
  others: 'OTH',
  work1Main: 'W1M',
  work1Misc: 'W1X',
  projectManagement: 'PM',
  learning: 'LRN',
  meditation: 'MED',
  exercise: 'EXE',
}

/**
 * Maps tag abbreviation → the numeric formData field name.
 * Some tagSnapshot keys differ from their formData counterparts (e.g. "essentials" → "spentOnEssentials")
 * so we maintain an explicit mapping here instead of relying on key lookup.
 */
export const TAG_TO_FIELD: Record<string, string> = {
  AV:   'avdhanaMode',
  WCMN: 'work1ToWork4Ikigai',
  W3:   'work3Udemy',
  W4:   'work4TechWebsite',
  W2:   'work2Youtube',
  W5:   'work5OnlineSale',
  LTG:  'ltgLongTermGoal',
  TW:   'timeWasted',
  ESS:  'spentOnEssentials',
  FIN:  'finance',
  OTH:  'others',
  W1M:  'work1Main',
  W1X:  'work1Misc',
  PM:   'projectManagement',
  LRN:  'learning',
  MED:  'meditation',
  EXE:  'exercise',
}

/** Set of all formData fields that must be stored as numbers (minutes) */
export const NUMERIC_FIELDS = new Set<string>([
  'avdhanaMode', 'work1ToWork4Ikigai', 'work3Udemy', 'work4TechWebsite',
  'work2Youtube', 'work5OnlineSale', 'ltgLongTermGoal', 'timeWasted',
  'spentOnEssentials', 'finance', 'others', 'work1Main', 'work1Misc',
  'projectManagement', 'learning', 'meditation', 'exercise',
])

/**
 * Resolve tag abbreviation → formData field name.
 * Returns null if the abbreviation is not recognized.
 */
export function resolveField(abbreviation: string): string | null {
  return TAG_TO_FIELD[abbreviation.toUpperCase()] ?? null
}

/**
 * Build a patch object from { labelName → minutes } to apply to formData.
 * Returns { fieldName: minutes } for all recognized tags.
 * Unrecognized tags are returned in the `unknown` array.
 */
export function buildFieldPatch(
  tagMinutes: Record<string, number>
): { patch: Partial<TimesheetFormData>; unknown: string[] } {
  const patch: Partial<TimesheetFormData> = {}
  const unknown: string[] = []

  for (const [tag, minutes] of Object.entries(tagMinutes)) {
    const field = resolveField(tag)
    if (field) {
      ;(patch as Record<string, unknown>)[field] = minutes
    } else {
      unknown.push(tag)
    }
  }

  return { patch, unknown }
}
