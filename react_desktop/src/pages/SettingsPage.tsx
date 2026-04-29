import { useState, type ReactNode } from 'react'
import { Plus, Trash2, Check, X, Cloud, CloudDownload, ChevronDown, ChevronUp } from 'lucide-react'
import { useTimerProfiles } from '../queries/useTimerProfiles'
import { useSettings } from '../queries/useSettings'
import { useSaveTimerProfile, useDeleteTimerProfile } from '../mutations/useSaveTimerProfile'
import { useSaveSettings } from '../mutations/useSaveSettings'
import { usePushToCloud } from '../mutations/usePushToCloud'
import { usePullFromCloud } from '../mutations/usePullFromCloud'
import { useTimer } from '../context/TimerContext'
import { formatDateId } from '../lib/dateUtils'
import type { TimerProfile } from '../types/settings'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
      <div>
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#c54af0]' : 'bg-[#2a2a2a]'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )
}

interface ProfileEditorProps {
  profile: TimerProfile
  isActive: boolean
  onSave: (p: TimerProfile) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

function ProfileEditor({ profile, isActive, onSave, onDelete, onSelect }: ProfileEditorProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<TimerProfile>(profile)
  const [confirming, setConfirming] = useState(false)

  function field(key: keyof TimerProfile, label: string, unit = 'min') {
    const val = draft[key] as number
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setDraft((d) => ({ ...d, [key]: Math.max(1, val - 1) }))} className="w-6 h-6 flex items-center justify-center rounded bg-[#2a2a2a] text-gray-400 hover:text-white text-sm">−</button>
          <span className="w-10 text-center text-sm text-white">{val}</span>
          <button onClick={() => setDraft((d) => ({ ...d, [key]: val + 1 }))} className="w-6 h-6 flex items-center justify-center rounded bg-[#2a2a2a] text-gray-400 hover:text-white text-sm">+</button>
          <span className="text-xs text-gray-600 w-6">{unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      {confirming ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm text-gray-300">Delete <strong>{profile.name}</strong>?</span>
          <button onClick={() => onDelete(profile.id)} className="px-3 py-1 text-xs rounded bg-red-600/80 text-white hover:bg-red-500">Delete</button>
          <button onClick={() => setConfirming(false)} className="px-3 py-1 text-xs rounded bg-[#2a2a2a] text-gray-400 hover:text-white">Cancel</button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-3">
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#d975f7] shrink-0" />}
            <span className="flex-1 text-sm font-medium text-white">{profile.name}</span>
            <span className="text-xs text-gray-600">{profile.focusMinutes}/{profile.breakMinutes}</span>
            {!isActive && (
              <button onClick={() => onSelect(profile.id)} className="text-xs text-gray-500 hover:text-[#d975f7] transition-colors">
                Use
              </button>
            )}
            <button onClick={() => setOpen((o) => !o)} className="p-1 text-gray-600 hover:text-gray-300">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {!profile.isDefault && (
              <button onClick={() => setConfirming(true)} className="p-1 text-gray-700 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {open && (
            <div className="border-t border-[#2a2a2a] px-4 py-3 space-y-3">
              <div className="space-y-2">
                {field('focusMinutes', 'Focus')}
                {field('breakMinutes', 'Short break')}
                {field('longBreakMinutes', 'Long break')}
                {field('longBreakAfter', 'Long break after', 'sess')}
              </div>
              <div className="space-y-1.5">
                {(['autoStartBreak', 'autoStartWork'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft[key] as boolean}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                      className="accent-[#c54af0]"
                    />
                    {key === 'autoStartBreak' ? 'Auto-start break' : 'Auto-start work'}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { onSave({ ...draft, name: draft.name || profile.name }); setOpen(false) }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#c54af0] text-white hover:bg-[#d975f7]"
                >
                  <Check size={12} /> Save
                </button>
                <button
                  onClick={() => { setDraft(profile); setOpen(false) }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white"
                >
                  <X size={12} /> Discard
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { data: profiles = [] } = useTimerProfiles()
  const { data: settings } = useSettings()
  const { state: timerState, setProfile } = useTimer()
  const saveProfile = useSaveTimerProfile()
  const deleteProfile = useDeleteTimerProfile()
  const saveSettings = useSaveSettings()
  const pushToCloud = usePushToCloud()
  const pullFromCloud = usePullFromCloud()
  const [cloudStatus, setCloudStatus] = useState<string | null>(null)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  function handleSaveProfile(profile: TimerProfile) {
    saveProfile.mutate(profile)
  }

  function handleDeleteProfile(id: string) {
    if (id === timerState.profileId) return // can't delete active
    deleteProfile.mutate(id)
  }

  function handleUseProfile(id: string) {
    setProfile(id)
    if (settings) saveSettings.mutate({ ...settings, activeProfileId: id })
  }

  function handleCreateProfile() {
    if (!newProfileName.trim()) return
    const newProfile: TimerProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName.trim(),
      focusMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakAfter: 4,
      autoStartBreak: true,
      autoStartWork: false,
      isDefault: false,
    }
    saveProfile.mutate(newProfile)
    setNewProfileName('')
    setCreatingProfile(false)
  }

  async function handlePush() {
    setCloudStatus(null)
    const result = await pushToCloud.mutateAsync()
    if (result.errors.length > 0) {
      setCloudStatus(`Error: ${result.errors[0]}`)
    } else if (result.unknownTags.length > 0) {
      setCloudStatus(`Pushed. Unknown tags skipped: ${result.unknownTags.join(', ')}`)
    } else if (result.pushed.length === 0) {
      setCloudStatus('No sessions to push.')
    } else {
      setCloudStatus(`Saved ${result.pushed.length} date(s) to cloud.`)
    }
  }

  async function handlePull() {
    setCloudStatus(null)
    // Pull last 30 days
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return formatDateId(d.getTime())
    })
    const result = await pullFromCloud.mutateAsync(dates)
    if (result.errors.length > 0) {
      setCloudStatus(`Pull error: ${result.errors[0]}`)
    } else {
      setCloudStatus(`Pulled ${result.entries.length} cloud entr${result.entries.length === 1 ? 'y' : 'ies'}.`)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 space-y-8 max-w-lg">
        <h1 className="text-base font-semibold text-white">Settings</h1>

        {/* ── Timer Profiles ───────────────────────────────────────────── */}
        <Section title="Timer Profiles">
          <div className="space-y-2">
            {profiles.map((p) => (
              <ProfileEditor
                key={p.id}
                profile={p}
                isActive={p.id === timerState.profileId}
                onSave={handleSaveProfile}
                onDelete={handleDeleteProfile}
                onSelect={handleUseProfile}
              />
            ))}

            {creatingProfile ? (
              <div className="bg-[#1a1a1a] border border-[#c54af0]/40 rounded-lg p-3 flex items-center gap-2">
                <input
                  autoFocus
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') setCreatingProfile(false) }}
                  placeholder="Profile name (e.g. 50/10)"
                  className="flex-1 px-2 py-1 text-sm bg-[#121212] border border-[#2a2a2a] rounded text-white placeholder-gray-600 focus:outline-none focus:border-[#c54af0]"
                />
                <button onClick={handleCreateProfile} className="p-1.5 rounded bg-[#c54af0] text-white hover:bg-[#d975f7]"><Check size={13} /></button>
                <button onClick={() => setCreatingProfile(false)} className="p-1.5 rounded bg-[#2a2a2a] text-gray-400 hover:text-white"><X size={13} /></button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingProfile(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-gray-500 border border-dashed border-[#2a2a2a] hover:border-[#c54af0] hover:text-gray-300 transition-colors"
              >
                <Plus size={14} /> New Profile
              </button>
            )}
          </div>
        </Section>

        {/* ── General ─────────────────────────────────────────────────── */}
        {settings && (
          <Section title="General">
            <Toggle
              label="Browser notifications"
              sub="Alert when focus or break ends"
              checked={settings.notificationsEnabled}
              onChange={(v) => saveSettings.mutate({ ...settings, notificationsEnabled: v })}
            />
            <Toggle
              label="Warn if no label"
              sub="Prompt before starting without a label"
              checked={settings.warnIfNoLabel}
              onChange={(v) => saveSettings.mutate({ ...settings, warnIfNoLabel: v })}
            />
          </Section>
        )}

        {/* ── Cloud Sync ───────────────────────────────────────────────── */}
        <Section title="Cloud Sync">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-500">
              Sessions are saved locally. Use the buttons below to sync with Firestore.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePush}
                disabled={pushToCloud.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[#c54af0] text-white hover:bg-[#d975f7] disabled:opacity-50 transition-colors"
              >
                <Cloud size={14} />
                {pushToCloud.isPending ? 'Saving…' : 'Save to Cloud'}
              </button>
              <button
                onClick={handlePull}
                disabled={pullFromCloud.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-gray-300 bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-50 transition-colors"
              >
                <CloudDownload size={14} />
                {pullFromCloud.isPending ? 'Pulling…' : 'Pull from Cloud'}
              </button>
            </div>
            {cloudStatus && (
              <p className="text-xs text-gray-400 bg-[#121212] rounded px-3 py-2">{cloudStatus}</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
