import { useCallback, useState } from "react";
import {
  StartTimer, PauseTimer, ResumeTimer, StopTimer, SkipTimer,
  ResetCompletedSessions, SetMiniMode,
} from "../wailsjs/go/main/App";
import { useTimerStore } from "../stores/timerStore";
import { useTimerDisplay, useTimerProgress } from "../hooks/useTimer";
import { CircularProgress } from "../components/Timer/CircularProgress";
import { TimerControls } from "../components/Timer/TimerControls";
import { LabelSelector } from "../components/Timer/LabelSelector";
import type { TimerTypeKind } from "../types";

const TYPE_LABELS: Record<TimerTypeKind, string> = {
  FOCUS: "Focus",
  BREAK: "Short Break",
  LONG_BREAK: "Long Break",
};

const TYPE_COLORS: Record<TimerTypeKind, string> = {
  FOCUS: "#c54af0",
  BREAK: "#3B82F6",
  LONG_BREAK: "#10B981",
};

export function TimerPage() {
  const { state } = useTimerStore();
  const display = useTimerDisplay();
  const progress = useTimerProgress();
  const [miniMode, setMiniMode] = useState(false);

  const handleStart  = useCallback(() => StartTimer().catch(console.error), []);
  const handlePause  = useCallback(() => PauseTimer().catch(console.error), []);
  const handleResume = useCallback(() => ResumeTimer().catch(console.error), []);
  const handleStop   = useCallback(() => StopTimer().catch(console.error), []);
  const handleSkip   = useCallback(() => SkipTimer().catch(console.error), []);

  const toggleMini = useCallback(() => {
    const next = !miniMode;
    setMiniMode(next);
    SetMiniMode(next).catch(console.error);
  }, [miniMode]);

  const handleResetSessions = useCallback(() => {
    ResetCompletedSessions().catch(console.error);
  }, []);

  const color = TYPE_COLORS[state.timerType];

  if (miniMode) {
    return <MiniWidget
      display={display}
      timerType={state.timerType}
      kind={state.kind}
      color={color}
      onStart={handleStart}
      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}
      onExpand={toggleMini}
    />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
      {/* Top row: timer type badge + mini-mode button */}
      <div className="flex items-center gap-3">
        <span
          className="px-4 py-1 rounded-full text-sm font-medium uppercase tracking-widest"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {TYPE_LABELS[state.timerType]}
        </span>
        <button
          onClick={toggleMini}
          title="Mini widget mode"
          className="p-1.5 rounded-full text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors text-xs"
        >
          ⊟
        </button>
      </div>

      {/* Circular progress ring with time display */}
      <CircularProgress
        progress={progress}
        size={180}
        strokeWidth={10}
        color={color}
        trackColor="#2a2a2a"
      >
        <div className="flex flex-col items-center select-none">
          <span className="text-5xl font-mono font-light text-white tabular-nums tracking-tight">
            {display}
          </span>
          {state.completedSessions > 0 && (
            <button
              onClick={handleResetSessions}
              title="Reset session count"
              className="text-sm text-gray-500 mt-1 hover:text-gray-300 transition-colors cursor-pointer"
            >
              {state.completedSessions} session{state.completedSessions !== 1 ? "s" : ""} ↺
            </button>
          )}
        </div>
      </CircularProgress>

      {/* Label selector */}
      <LabelSelector activeLabel={state.activeLabelName} />

      {/* Controls */}
      <TimerControls
        kind={state.kind}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onSkip={handleSkip}
      />

      {/* Finished message */}
      {state.kind === "FINISHED" && (
        <p className="text-gray-400 text-sm animate-pulse-slow">
          {state.timerType === "FOCUS" ? "Time for a break! 🎉" : "Back to work!"}
        </p>
      )}
    </div>
  );
}

// ─── Mini Widget ──────────────────────────────────────────────────────────────

interface MiniProps {
  display: string;
  timerType: TimerTypeKind;
  kind: string;
  color: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onExpand: () => void;
}

function MiniWidget({ display, timerType, kind, color, onStart, onPause, onResume, onStop, onExpand }: MiniProps) {
  return (
    <div
      className="flex items-center justify-between h-screen px-3 gap-2 select-none"
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
    >
      {/* Timer type dot + time */}
      <div className="flex items-center gap-2" style={{ "--wails-draggable": "drag" } as React.CSSProperties}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-mono font-light text-white tabular-nums text-xl tracking-tight">
          {display}
        </span>
        <span className="text-[9px] text-gray-500 uppercase tracking-widest hidden sm:block">
          {timerType === "FOCUS" ? "focus" : timerType === "BREAK" ? "brk" : "lng"}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        {kind === "RESET" && (
          <MiniBtn onClick={onStart} title="Start">▶</MiniBtn>
        )}
        {kind === "RUNNING" && (
          <MiniBtn onClick={onPause} title="Pause">⏸</MiniBtn>
        )}
        {kind === "PAUSED" && (
          <MiniBtn onClick={onResume} title="Resume">▶</MiniBtn>
        )}
        {(kind === "RUNNING" || kind === "PAUSED") && (
          <MiniBtn onClick={onStop} title="Stop">■</MiniBtn>
        )}
        {kind === "FINISHED" && (
          <MiniBtn onClick={onStart} title="Next">▶</MiniBtn>
        )}
        <MiniBtn onClick={onExpand} title="Expand" dim>⊞</MiniBtn>
      </div>
    </div>
  );
}

function MiniBtn({ onClick, title, children, dim }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors
        ${dim
          ? "text-gray-600 hover:text-gray-400"
          : "text-gray-300 hover:text-white hover:bg-surface-700"}`}
    >
      {children}
    </button>
  );
}
