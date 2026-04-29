import { useEffect, useState } from 'react'
import { Play, Pause, Square, SkipForward, AlertTriangle } from 'lucide-react'
import { useTimer } from '../context/TimerContext'
import { useSettings } from '../queries/useSettings'
import { useTimerProfiles } from '../queries/useTimerProfiles'
import CircularProgress from '../components/Timer/CircularProgress'
import LabelPicker from '../components/Timer/LabelPicker'
import SessionDots from '../components/Timer/SessionDots'
import ProfileBadge from '../components/Timer/ProfileBadge'
import { formatMmSs } from '../lib/dateUtils'

const TYPE_COLOR: Record<string, string> = {
  FOCUS: '#d975f7',
  BREAK: '#4ade80',
  LONG_BREAK: '#60a5fa',
}

const TYPE_LABEL: Record<string, string> = {
  FOCUS: 'FOCUS',
  BREAK: 'BREAK',
  LONG_BREAK: 'LONG BREAK',
}

export default function TimerPage() {
  const { state, start, pause, resume, stop, skip, setLabel, setProfile, resetSessions } = useTimer()
  const { data: settings } = useSettings()
  const { data: profiles = [] } = useTimerProfiles()
  const [noLabelWarn, setNoLabelWarn] = useState(false)

  const progress = state.totalMs > 0 ? state.remainingMs / state.totalMs : 1
  const color = TYPE_COLOR[state.timerType]
  const profile = profiles.find((p) => p.id === state.profileId) ?? profiles[0]

  // Update page title while running
  useEffect(() => {
    if (state.kind === 'RUNNING') {
      document.title = `${formatMmSs(state.remainingMs)} — ${TYPE_LABEL[state.timerType]} | Goodtime`
    } else {
      document.title = 'Goodtime Pomodoro'
    }
  }, [state.kind, state.remainingMs, state.timerType])

  // Cleanup title on unmount
  useEffect(() => () => { document.title = 'Goodtime Pomodoro' }, [])

  // Keyboard shortcuts — intentionally no dep array to always get fresh state
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') { e.preventDefault(); handlePlayPause() }
      else if (e.key === 'Escape') stop()
      else if (e.key.toLowerCase() === 'n') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handlePlayPause() {
    if (state.kind === 'RUNNING') {
      pause()
    } else if (state.kind === 'PAUSED') {
      resume()
    } else {
      if (settings?.warnIfNoLabel && !state.activeLabelName && state.timerType === 'FOCUS') {
        setNoLabelWarn(true)
        return
      }
      start()
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Left: Ring ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ color, backgroundColor: color + '22' }}
        >
          {TYPE_LABEL[state.timerType]}
        </span>

        <div className="relative flex items-center justify-center">
          <CircularProgress progress={progress} size={260} strokeWidth={12} color={color} />
          <div className="absolute flex flex-col items-center gap-1">
            <span className="text-5xl font-mono font-light text-white tabular-nums tracking-tight">
              {formatMmSs(state.remainingMs)}
            </span>
            {state.kind === 'PAUSED' && (
              <span className="text-xs text-gray-500 uppercase tracking-widest">Paused</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Controls ──────────────────────────────────────────── */}
      <div className="w-[280px] shrink-0 flex flex-col justify-center gap-6 pr-8 pl-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Label</label>
          <LabelPicker value={state.activeLabelName} onChange={setLabel} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handlePlayPause}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ backgroundColor: color, color: '#000' }}
          >
            {state.kind === 'RUNNING' ? <Pause size={18} /> : <Play size={18} />}
            {state.kind === 'RUNNING' ? 'Pause' : state.kind === 'PAUSED' ? 'Resume' : 'Start'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={stop}
              disabled={state.kind === 'RESET'}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm text-gray-400 bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
            <button
              onClick={skip}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm text-gray-400 bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors"
            >
              <SkipForward size={14} />
              Skip
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <SessionDots
            completed={state.completedSessions}
            total={profile?.longBreakAfter ?? 4}
            onReset={resetSessions}
          />
          <ProfileBadge profileId={state.profileId} onSelect={setProfile} />
        </div>

        <p className="text-xs text-gray-700 text-center">Space · Esc to stop · N to skip</p>
      </div>

      {/* ── No-label warning dialog ───────────────────────────────────── */}
      {noLabelWarn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-80 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-yellow-400 shrink-0" />
              <p className="text-sm text-gray-200">No label selected. Time won't be tracked against a tag.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setNoLabelWarn(false); setLabel('OTH'); start() }}
                className="w-full py-2 rounded-lg text-sm font-medium bg-[#c54af0] text-white hover:bg-[#d975f7] transition-colors"
              >
                Use Others (OTH)
              </button>
              <button
                onClick={() => { setNoLabelWarn(false); start() }}
                className="w-full py-2 rounded-lg text-sm text-gray-300 bg-[#2a2a2a] hover:bg-[#333] transition-colors"
              >
                Start anyway
              </button>
              <button
                onClick={() => setNoLabelWarn(false)}
                className="w-full py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
