import { create } from "zustand";
import type { Label, AppSettings, TimerProfile } from "../types";

interface AppStore {
  labels: Label[];
  settings: AppSettings | null;
  timerProfiles: TimerProfile[];
  setLabels: (labels: Label[]) => void;
  setSettings: (s: AppSettings) => void;
  setTimerProfiles: (p: TimerProfile[]) => void;
  activeTab: "timer" | "stats" | "labels" | "settings";
  setActiveTab: (tab: AppStore["activeTab"]) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  labels: [],
  settings: null,
  timerProfiles: [],
  activeTab: "timer",
  setLabels: (labels) => set({ labels }),
  setSettings: (settings) => set({ settings }),
  setTimerProfiles: (timerProfiles) => set({ timerProfiles }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
