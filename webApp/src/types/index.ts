export enum TimerType {
  FOCUS = 'FOCUS',
  BREAK = 'BREAK',
  LONG_BREAK = 'LONG_BREAK'
}

export enum TimerState {
  STOPPED = 'STOPPED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED'
}

export interface TimerProfile {
  name?: string;
  isCountdown: boolean;
  workDuration: number;
  isBreakEnabled: boolean;
  breakDuration: number;
  isLongBreakEnabled: boolean;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  workBreakRatio: number;
}

export interface Session {
  id: string;
  label: string;
  timerType: TimerType;
  duration: number;
  endTime: number;
  archived: boolean;
}

export interface Label {
  id: string;
  title: string;
  color: number;
  archived: boolean;
  orderIndex: number;
}

export const DEFAULT_TIMER_PROFILE: TimerProfile = {
  name: '25/5',
  isCountdown: true,
  workDuration: 25,
  isBreakEnabled: true,
  breakDuration: 5,
  isLongBreakEnabled: false,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  workBreakRatio: 3
};