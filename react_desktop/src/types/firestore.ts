export interface TagSnapshot {
  avdhanaMode: string
  wcmn: string
  work3: string
  work4: string
  work2: string
  work5: string
  ltg: string
  timeWasted: string
  essentials: string
  finance: string
  others: string
  work1Main: string
  work1Misc: string
  projectManagement: string
  learning: string
  meditation: string
  exercise: string
  [key: string]: string
}

export interface TimesheetFormData {
  entryDate: number
  tagSnapshot: TagSnapshot

  intoxNo: string
  mbtNo: string
  topPriorityTime: string
  topPriorityThinking: string
  playedFirstThingComesToMindGame: boolean

  thinking: boolean
  issue: string
  issueOtherText: string

  onTimeSleep: boolean
  mpvOfSleep: boolean
  wakedUpAt4Am: boolean
  selfAndSurroundingVastu: boolean

  twentyMinsLearning: boolean
  thirtyMinsMeditation: boolean
  sixtyMinsExercise: boolean

  overallHealthStatus: number

  phase2Sleep: boolean
  minimum270Min: boolean
  dayProductivity: string
  timePocketFollowed: boolean
  youtubeTimeUtilizerDocFollowed: boolean

  wastedMoreThan15Mins: boolean
  approxWastedMinutes: number
  activity1: string
  activity2: string
  activity3: string
  activity4: string
  activity5: string

  pomodoroFollowed: boolean
  sprint: number

  // numeric time fields (minutes)
  avdhanaMode: number
  work1ToWork4Ikigai: number
  work3Udemy: number
  work4TechWebsite: number
  work2Youtube: number
  work5OnlineSale: number
  ltgLongTermGoal: number
  timeWasted: number
  spentOnEssentials: number
  finance: number
  others: number
  work1Main: number
  work1Misc: number
  projectManagement: number
  learning: number
  meditation: number
  exercise: number

  mitsCompletedWithin270To360Mins: boolean
  total: string
  completed270MinsBeforeSixPm: boolean
  ableToCompleteDaysMits: boolean

  carpeMomentum1440FollowedToday: boolean
  timePocketFollowedToday: boolean
  productivityPointsSuccessDocFollowed: boolean
  anchorPoints: boolean

  sitStraightFor2Sprints: boolean
  didEverythingTimeBound: boolean
  followed4To4Policy: boolean
  ateBreakfastDistractionFree: boolean
  satOnTimeAfterDWT3: boolean

  relaxationAfter2Sprints: string
  sleepPhase1: string
  sleepPhase2: string
  pppw: string
  tppw: string
  entertainment: string

  [key: string]: unknown
}

export interface TimesheetEntry {
  id: string           // "dd-mm-yyyy"
  createdAt: number    // epoch ms
  formData: TimesheetFormData
}

export interface CloudAppHistoryEntry {
  id: string
  labelName: string
  date: string
  durationMinutes: number
  startedAt: number
  endedAt: number
  deviceName: string
}

export interface CloudAppHistory {
  id: string           // "dd-mm-yyyy"
  entries: CloudAppHistoryEntry[]
}
