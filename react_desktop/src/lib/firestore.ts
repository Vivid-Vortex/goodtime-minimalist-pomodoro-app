import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { TimesheetEntry, TimesheetFormData, CloudAppHistoryEntry } from '../types/firestore'
import { DEFAULT_TAG_SNAPSHOT } from './tagMapping'
import { parseDateId } from './dateUtils'

const TIMESHEET_COL = 'timesheet_entries'
const HISTORY_COL = 'pomodoro_app_history'

// ── Default template ──────────────────────────────────────────────────────────

function buildDefaultFormData(dateId: string): TimesheetFormData {
  const entryDate = parseDateId(dateId)
  return {
    entryDate,
    tagSnapshot: { ...DEFAULT_TAG_SNAPSHOT },

    intoxNo: 'N/A',
    mbtNo: 'N/A',
    topPriorityTime: '',
    topPriorityThinking: 'N/A',
    playedFirstThingComesToMindGame: false,

    thinking: true,
    issue: 'NONE',
    issueOtherText: '',

    onTimeSleep: false,
    mpvOfSleep: false,
    wakedUpAt4Am: false,
    selfAndSurroundingVastu: false,

    twentyMinsLearning: false,
    thirtyMinsMeditation: false,
    sixtyMinsExercise: false,

    overallHealthStatus: 1,

    phase2Sleep: false,
    minimum270Min: false,
    dayProductivity: 'PRODUCTIVE',
    timePocketFollowed: false,
    youtubeTimeUtilizerDocFollowed: false,

    wastedMoreThan15Mins: false,
    approxWastedMinutes: 0,
    activity1: '',
    activity2: '',
    activity3: '',
    activity4: '',
    activity5: '',

    pomodoroFollowed: false,
    sprint: 6,

    avdhanaMode: 0,
    work1ToWork4Ikigai: 0,
    work3Udemy: 0,
    work4TechWebsite: 0,
    work2Youtube: 0,
    work5OnlineSale: 0,
    ltgLongTermGoal: 0,
    timeWasted: 0,
    spentOnEssentials: 0,
    finance: 0,
    others: 0,
    work1Main: 0,
    work1Misc: 0,
    projectManagement: 0,
    learning: 0,
    meditation: 0,
    exercise: 0,

    mitsCompletedWithin270To360Mins: false,
    total: '',
    completed270MinsBeforeSixPm: false,
    ableToCompleteDaysMits: false,

    carpeMomentum1440FollowedToday: false,
    timePocketFollowedToday: false,
    productivityPointsSuccessDocFollowed: false,
    anchorPoints: false,

    sitStraightFor2Sprints: false,
    didEverythingTimeBound: false,
    followed4To4Policy: false,
    ateBreakfastDistractionFree: false,
    satOnTimeAfterDWT3: false,

    relaxationAfter2Sprints: '',
    sleepPhase1: '',
    sleepPhase2: '',
    pppw: '',
    tppw: '',
    entertainment: '',
  }
}

// ── Timesheet entries ─────────────────────────────────────────────────────────

export async function getTimesheetEntry(dateId: string): Promise<TimesheetEntry | null> {
  const ref = doc(collection(db, TIMESHEET_COL), dateId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as TimesheetEntry
}

/**
 * Create a new entry if it doesn't exist, or merge the field patch into the existing one.
 * fieldPatch is a flat map of { formDataField: minutesToAdd }.
 */
export async function upsertTimesheetEntry(
  dateId: string,
  fieldPatch: Record<string, number>
): Promise<void> {
  const ref = doc(collection(db, TIMESHEET_COL), dateId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const formData = buildDefaultFormData(dateId)
    for (const [field, minutes] of Object.entries(fieldPatch)) {
      ;(formData as Record<string, unknown>)[field] = minutes
    }
    const entryDate = parseDateId(dateId)
    await setDoc(ref, {
      id: dateId,
      createdAt: entryDate,
      formData,
    })
  } else {
    const existing = snap.data() as TimesheetEntry
    const updates: Record<string, unknown> = {}
    for (const [field, minutes] of Object.entries(fieldPatch)) {
      const current = (existing.formData as Record<string, unknown>)[field]
      const currentNum = typeof current === 'number' ? current : 0
      updates[`formData.${field}`] = currentNum + minutes
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates)
    }
  }
}

/**
 * Overwrite specific formData fields (used when pushing calculated totals).
 * Does NOT add — replaces the field value outright.
 */
export async function setTimesheetFields(
  dateId: string,
  fieldValues: Record<string, number>
): Promise<void> {
  const ref = doc(collection(db, TIMESHEET_COL), dateId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const formData = buildDefaultFormData(dateId)
    for (const [field, val] of Object.entries(fieldValues)) {
      ;(formData as Record<string, unknown>)[field] = val
    }
    const entryDate = parseDateId(dateId)
    await setDoc(ref, { id: dateId, createdAt: entryDate, formData })
  } else {
    const updates: Record<string, unknown> = {}
    for (const [field, val] of Object.entries(fieldValues)) {
      updates[`formData.${field}`] = val
    }
    await updateDoc(ref, updates)
  }
}

// ── Fetch all timesheet entries (for Statistics) ──────────────────────────────

export async function getAllTimesheetEntries(): Promise<TimesheetEntry[]> {
  const snap = await getDocs(collection(db, TIMESHEET_COL))
  return snap.docs.map((d) => d.data() as TimesheetEntry)
}

// ── App history ───────────────────────────────────────────────────────────────

export async function getAppHistory(dateId: string): Promise<CloudAppHistoryEntry[]> {
  const ref = doc(collection(db, HISTORY_COL), dateId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  const data = snap.data() as { entries?: CloudAppHistoryEntry[] }
  return data.entries ?? []
}

export async function pushAppHistoryEntry(
  dateId: string,
  entry: CloudAppHistoryEntry
): Promise<void> {
  const ref = doc(collection(db, HISTORY_COL), dateId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { id: dateId, entries: [entry] })
  } else {
    await updateDoc(ref, { entries: arrayUnion(entry) })
  }
}
