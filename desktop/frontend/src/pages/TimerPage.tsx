import { useCallback } from "react";
import {
  StartTimer, PauseTimer, ResumeTimer, StopTimer, SkipTimer,
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

  const handleStart  = useCallback(() => StartTimer().catch(console.error), []);
  const handlePause  = useCallback(() => PauseTimer().catch(console.error), []);
  const handleResume = useCallback(() => ResumeTimer().catch(console.error), []);
  const handleStop   = useCallback(() => StopTimer().catch(console.error), []);
  const handleSkip   = useCallback(() => SkipTimer().catch(console.error), []);

  const color = TYPE_COLORS[state.timerType];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      {/* Timer type badge */}
      <span
        className="px-4 py-1 rounded-full text-sm font-medium uppercase tracking-widest"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {TYPE_LABELS[state.timerType]}
      </span>

      {/* Circular progress ring with time display */}
      <CircularProgress
        progress={progress}
        size={260}
        strokeWidth={10}
        color={color}
        trackColor="#2a2a2a"
      >
        <div className="flex flex-col items-center select-none">
          <span className="text-6xl font-mono font-light text-white tabular-nums tracking-tight">
            {display}
          </span>
          {state.completedSessions > 0 && (
            <span className="text-sm text-gray-500 mt-1">
              {state.completedSessions} session{state.completedSessions !== 1 ? "s" : ""} today
            </span>
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
