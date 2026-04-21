// TypeScript types mirroring Go models in internal/database/models.go

export type StateKind = "RESET" | "RUNNING" | "PAUSED" | "FINISHED";
export type TimerTypeKind = "FOCUS" | "BREAK" | "LONG_BREAK";

export interface TimerState {
  kind: StateKind;
  timerType: TimerTypeKind;
  elapsedSeconds: number;
  totalSeconds: number;
  completedSessions: number;
  activeLabelName: string;
}

export interface TimerProfile {
  name: string;
  isCountdown: boolean;
  workDuration: number;
  isBreakEnabled: boolean;
  breakDuration: number;
  isLongBreakEnabled: boolean;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  workBreakRatio: number;
}

export interface Label {
  name: string;
  colorIndex: number;
  orderIndex: number;
  useDefaultProfile: boolean;
  timerProfile: TimerProfile;
  isArchived: boolean;
}

export interface Session {
  id: number;
  timestamp: number;
  duration: number;
  interruptions: number;
  labelName: string;
  notes: string;
  isWork: boolean;
  isArchived: boolean;
  deviceName: string;
}

export interface AppSettings {
  activeLabelName: string;
  defaultTimerProfileName: string;
  theme: "dark" | "light" | "system";
  workFinishedSound: string;
  breakFinishedSound: string;
  autoStartWork: boolean;
  autoStartBreak: boolean;
  enableDesktopNotifications: boolean;
  cloudBackupEnabled: boolean;
  lastSyncTimestamp: number;
  cloudSyncSchedule: string;
}

export interface Summary {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionCount: number;
  perLabel: Record<string, number>;
}

export interface TimelineEntry {
  dateMillis: number;
  labelName: string;
  minutes: number;
}

export interface CloudSyncStatus {
  docsCreated: number;
  docsUpdated: number;
  error: string;
  credsMissing: boolean;
}

export interface CloudHistoryEntry {
  dateMillis: number;
  labelName: string;
  minutes: number;
  deviceName: string;
  fetchedAt: number;
}

export interface CloudTimelineEntry {
  dateMillis: number;
  labelName: string;
  minutes: number;
  fetchedAt: number;
}

// Request types
export interface ListRequest {
  labelNames?: string[];
  afterMillis?: number;
  onlyWork?: boolean;
  limit?: number;
  offset?: number;
}

export interface UpdateRequest {
  id: number;
  timestamp: number;
  duration: number;
  interruptions: number;
  labelName: string;
  notes: string;
  isWork: boolean;
}

export interface BulkEditRequest {
  ids: number[];
  labelName: string;
}

export interface SummaryRequest {
  afterMillis?: number;
}

export interface TimelineRequest {
  labelNames?: string[];
  afterMillis?: number;
}

export interface CreateLabelRequest {
  name: string;
  colorIndex: number;
  useDefaultProfile: boolean;
  timerProfile: TimerProfile;
}

export interface UpdateLabelRequest {
  name: string;
  colorIndex: number;
  useDefaultProfile: boolean;
  timerProfile: TimerProfile;
}

export interface SettingsUpdateRequest {
  theme: string;
  workFinishedSound: string;
  breakFinishedSound: string;
  autoStartWork: boolean;
  autoStartBreak: boolean;
  enableDesktopNotifications: boolean;
  cloudBackupEnabled: boolean;
  defaultTimerProfileName: string;
}

// 24-color palette (same indices as Android app)
export const LABEL_COLORS: string[] = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7",
  "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
  "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
  "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
  "#795548", "#9E9E9E", "#607D8B", "#B71C1C",
  "#880E4F", "#4A148C", "#1A237E", "#006064",
];
