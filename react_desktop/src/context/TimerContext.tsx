import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { startCountdown } from '../lib/timer'
import { appendSession, getTimerProfiles, getSettings } from '../lib/localStorage'
import { todayId } from '../lib/dateUtils'
import { queryKeys } from '../queryKeys'
import { queryClient } from '../queryClient'
import type { Session } from '../types/session'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimerKind = 'RESET' | 'RUNNING' | 'PAUSED'
export type TimerType = 'FOCUS' | 'BREAK' | 'LONG_BREAK'

export interface TimerState {
  kind: TimerKind
  timerType: TimerType
  remainingMs: number
  totalMs: number
  completedSessions: number
  activeLabelName: string | null
  profileId: string
}

type Action =
  | { type: 'START'; totalMs: number; timerType: TimerType }
  | { type: 'TICK'; remainingMs: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP'; totalMs: number }
  | { type: 'SET_LABEL'; name: string | null }
  | { type: 'SET_PROFILE'; profileId: string; totalMs: number }
  | { type: 'RESET_SESSIONS' }
  | { type: 'PHASE'; timerType: TimerType; totalMs: number; running: boolean; completedSessions: number }

export interface TimerCtx {
  state: TimerState
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  skip: () => void
  setLabel: (name: string | null) => void
  setProfile: (profileId: string) => void
  resetSessions: () => void
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: TimerState, action: Action): TimerState {
  switch (action.type) {
    case 'START':
      return { ...state, kind: 'RUNNING', timerType: action.timerType, remainingMs: action.totalMs, totalMs: action.totalMs }
    case 'TICK':
      return state.kind === 'RUNNING' ? { ...state, remainingMs: action.remainingMs } : state
    case 'PAUSE':
      return state.kind === 'RUNNING' ? { ...state, kind: 'PAUSED' } : state
    case 'RESUME':
      return state.kind === 'PAUSED' ? { ...state, kind: 'RUNNING' } : state
    case 'STOP':
      return { ...state, kind: 'RESET', timerType: 'FOCUS', remainingMs: action.totalMs, totalMs: action.totalMs }
    case 'SET_LABEL':
      return { ...state, activeLabelName: action.name }
    case 'SET_PROFILE':
      return { ...state, profileId: action.profileId, kind: 'RESET', timerType: 'FOCUS', remainingMs: action.totalMs, totalMs: action.totalMs }
    case 'RESET_SESSIONS':
      return { ...state, completedSessions: 0 }
    case 'PHASE':
      return {
        ...state,
        kind: action.running ? 'RUNNING' : 'RESET',
        timerType: action.timerType,
        remainingMs: action.totalMs,
        totalMs: action.totalMs,
        completedSessions: action.completedSessions,
      }
    default:
      return state
  }
}

function initState(): TimerState {
  const profiles = getTimerProfiles()
  const settings = getSettings()
  const profile = profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0]
  return {
    kind: 'RESET',
    timerType: 'FOCUS',
    remainingMs: profile.focusMinutes * 60_000,
    totalMs: profile.focusMinutes * 60_000,
    completedSessions: 0,
    activeLabelName: null,
    profileId: profile.id,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

const Ctx = createContext<TimerCtx | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const stateRef = useRef(state)
  stateRef.current = state
  const cleanupRef = useRef<(() => void) | null>(null)

  function stopInterval() {
    cleanupRef.current?.()
    cleanupRef.current = null
  }

  // Reads profile durations from localStorage for the given profileId
  function profileMs(profileId: string) {
    const profiles = getTimerProfiles()
    const p = profiles.find((x) => x.id === profileId) ?? profiles[0]
    return {
      focusMs: p.focusMinutes * 60_000,
      breakMs: p.breakMinutes * 60_000,
      longBreakMs: p.longBreakMinutes * 60_000,
      longBreakAfter: p.longBreakAfter,
      autoStartBreak: p.autoStartBreak,
      autoStartWork: p.autoStartWork,
    }
  }

  const handleFinish = useCallback(() => {
    stopInterval()
    const s = stateRef.current
    const pm = profileMs(s.profileId)

    if (s.timerType === 'FOCUS') {
      // Save completed focus session
      if (s.activeLabelName) {
        const session: Session = {
          id: crypto.randomUUID(),
          labelName: s.activeLabelName,
          date: todayId(),
          durationMinutes: Math.round(s.totalMs / 60_000),
          startedAt: Date.now() - s.totalMs,
          endedAt: Date.now(),
        }
        appendSession(session)
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byDate(session.date) })
      }

      const newCount = s.completedSessions + 1
      const isLong = newCount % pm.longBreakAfter === 0
      const nextType: TimerType = isLong ? 'LONG_BREAK' : 'BREAK'
      const nextMs = isLong ? pm.longBreakMs : pm.breakMs

      dispatch({ type: 'PHASE', timerType: nextType, totalMs: nextMs, running: pm.autoStartBreak, completedSessions: newCount })

      if (pm.autoStartBreak) {
        cleanupRef.current = startCountdown(nextMs, (r) => dispatch({ type: 'TICK', remainingMs: r }), handleFinish)
      }

      notify('Focus complete!', 'Time for a break.')
    } else {
      dispatch({ type: 'PHASE', timerType: 'FOCUS', totalMs: pm.focusMs, running: pm.autoStartWork, completedSessions: s.completedSessions })

      if (pm.autoStartWork) {
        cleanupRef.current = startCountdown(pm.focusMs, (r) => dispatch({ type: 'TICK', remainingMs: r }), handleFinish)
      }

      notify('Break over!', 'Back to focus.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    stopInterval()
    const s = stateRef.current
    const pm = profileMs(s.profileId)
    const ms =
      s.timerType === 'LONG_BREAK' ? pm.longBreakMs
      : s.timerType === 'BREAK' ? pm.breakMs
      : pm.focusMs

    dispatch({ type: 'START', totalMs: ms, timerType: s.timerType })
    cleanupRef.current = startCountdown(ms, (r) => dispatch({ type: 'TICK', remainingMs: r }), handleFinish)
    requestNotifPermission()
  }, [handleFinish])

  const pause = useCallback(() => {
    stopInterval()
    dispatch({ type: 'PAUSE' })
  }, [])

  const resume = useCallback(() => {
    stopInterval()
    const remaining = stateRef.current.remainingMs
    dispatch({ type: 'RESUME' })
    cleanupRef.current = startCountdown(remaining, (r) => dispatch({ type: 'TICK', remainingMs: r }), handleFinish)
  }, [handleFinish])

  const stop = useCallback(() => {
    stopInterval()
    const pm = profileMs(stateRef.current.profileId)
    dispatch({ type: 'STOP', totalMs: pm.focusMs })
  }, [])

  const skip = useCallback(() => {
    stopInterval()
    const s = stateRef.current
    const pm = profileMs(s.profileId)
    if (s.timerType === 'FOCUS') {
      const newCount = s.completedSessions + 1
      const isLong = newCount % pm.longBreakAfter === 0
      const nextType: TimerType = isLong ? 'LONG_BREAK' : 'BREAK'
      const nextMs = isLong ? pm.longBreakMs : pm.breakMs
      dispatch({ type: 'PHASE', timerType: nextType, totalMs: nextMs, running: false, completedSessions: newCount })
    } else {
      dispatch({ type: 'PHASE', timerType: 'FOCUS', totalMs: pm.focusMs, running: false, completedSessions: s.completedSessions })
    }
  }, [])

  const setLabel = useCallback((name: string | null) => dispatch({ type: 'SET_LABEL', name }), [])

  const setProfile = useCallback((profileId: string) => {
    stopInterval()
    const pm = profileMs(profileId)
    dispatch({ type: 'SET_PROFILE', profileId, totalMs: pm.focusMs })
  }, [])

  const resetSessions = useCallback(() => dispatch({ type: 'RESET_SESSIONS' }), [])

  return (
    <Ctx.Provider value={{ state, start, pause, resume, stop, skip, setLabel, setProfile, resetSessions }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTimer(): TimerCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function notify(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}
