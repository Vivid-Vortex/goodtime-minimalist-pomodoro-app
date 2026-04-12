import { useEffect } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { GetTimerState } from "../wailsjs/go/main/App";
import { useTimerStore } from "../stores/timerStore";
import type { TimerState } from "../types";

const TIMER_TICK_EVENT = "timer:tick";

/** Subscribes to backend timer ticks and keeps the store in sync. */
export function useTimerSubscription() {
  const setState = useTimerStore((s) => s.setState);

  useEffect(() => {
    // Fetch initial state
    GetTimerState()
      .then(setState)
      .catch(() => {});

    // Subscribe to tick events
    const off = EventsOn(TIMER_TICK_EVENT, (data: unknown) => {
      setState(data as TimerState);
    });

    return off;
  }, [setState]);
}

/** Returns a formatted MM:SS string for the remaining / elapsed time. */
export function useTimerDisplay(): string {
  const { state } = useTimerStore();
  const { kind, timerType, elapsedSeconds, totalSeconds } = state;

  if (kind === "RESET") {
    const total =
      timerType === "FOCUS"
        ? totalSeconds
        : timerType === "BREAK"
          ? 5 * 60
          : 15 * 60;
    return formatSeconds(total);
  }

  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  return formatSeconds(remaining);
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Returns the fraction [0,1] of progress through the current segment. */
export function useTimerProgress(): number {
  const { state } = useTimerStore();
  const { kind, elapsedSeconds, totalSeconds } = state;
  if (kind === "RESET" || kind === "FINISHED" || totalSeconds === 0) return 0;
  return Math.min(1, elapsedSeconds / totalSeconds);
}
