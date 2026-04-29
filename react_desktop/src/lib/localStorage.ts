import type { Label } from '../types/label'
import type { Session } from '../types/session'
import type { AppSettings, TimerProfile } from '../types/settings'
import { DEFAULT_PROFILES, DEFAULT_SETTINGS } from '../types/settings'

const KEY_LABELS = 'gt_labels'
const KEY_SETTINGS = 'gt_settings'
const KEY_PROFILES = 'gt_timer_profiles'
const KEY_SESSIONS = 'gt_sessions'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Labels ────────────────────────────────────────────────────────────────────

export function getLabels(): Label[] {
  return read<Label[]>(KEY_LABELS, [])
}

export function saveLabels(labels: Label[]): void {
  write(KEY_LABELS, labels)
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return read<AppSettings>(KEY_SETTINGS, DEFAULT_SETTINGS)
}

export function saveSettings(settings: AppSettings): void {
  write(KEY_SETTINGS, settings)
}

// ── Timer profiles ────────────────────────────────────────────────────────────

export function getTimerProfiles(): TimerProfile[] {
  return read<TimerProfile[]>(KEY_PROFILES, DEFAULT_PROFILES)
}

export function saveTimerProfiles(profiles: TimerProfile[]): void {
  write(KEY_PROFILES, profiles)
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function getSessions(): Session[] {
  return read<Session[]>(KEY_SESSIONS, [])
}

export function getSessionsByDate(date: string): Session[] {
  return getSessions().filter((s) => s.date === date)
}

export function appendSession(session: Session): void {
  const all = getSessions()
  write(KEY_SESSIONS, [...all, session])
}

export function updateSession(id: string, patch: Partial<Session>): void {
  const all = getSessions().map((s) => (s.id === id ? { ...s, ...patch } : s))
  write(KEY_SESSIONS, all)
}

export function deleteSession(id: string): void {
  write(KEY_SESSIONS, getSessions().filter((s) => s.id !== id))
}
