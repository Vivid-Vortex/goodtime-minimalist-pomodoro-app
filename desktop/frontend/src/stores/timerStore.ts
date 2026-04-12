import { create } from "zustand";
import type { TimerState } from "../types";

interface TimerStore {
  state: TimerState;
  setState: (s: TimerState) => void;
}

const DEFAULT_STATE: TimerState = {
  kind: "RESET",
  timerType: "FOCUS",
  elapsedSeconds: 0,
  totalSeconds: 72 * 60,
  completedSessions: 0,
  activeLabelName: "Default",
};

export const useTimerStore = create<TimerStore>((set) => ({
  state: DEFAULT_STATE,
  setState: (s) => set({ state: s }),
}));
