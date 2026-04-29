export interface TimerProfile {
  id: string
  name: string            // e.g. "72/5"
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number  // sessions before long break
  autoStartBreak: boolean
  autoStartWork: boolean
  isDefault: boolean
}

export interface AppSettings {
  notificationsEnabled: boolean
  activeProfileId: string
  warnIfNoLabel: boolean
}

export const DEFAULT_PROFILES: TimerProfile[] = [
  {
    id: 'profile-72-5',
    name: '72/5',
    focusMinutes: 72,
    breakMinutes: 5,
    longBreakMinutes: 20,
    longBreakAfter: 4,
    autoStartBreak: true,
    autoStartWork: false,
    isDefault: true,
  },
  {
    id: 'profile-90-5',
    name: '90/5',
    focusMinutes: 90,
    breakMinutes: 5,
    longBreakMinutes: 20,
    longBreakAfter: 4,
    autoStartBreak: true,
    autoStartWork: false,
    isDefault: false,
  },
  {
    id: 'profile-25-5',
    name: '25/5',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfter: 4,
    autoStartBreak: true,
    autoStartWork: false,
    isDefault: false,
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  activeProfileId: 'profile-72-5',
  warnIfNoLabel: true,
}
