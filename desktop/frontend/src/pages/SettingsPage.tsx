import { useState, useEffect, useCallback } from "react";
import {
  GetSettings, UpdateSettings, GetTimerProfiles, SaveTimerProfile, DeleteTimerProfile,
  ExportBackup, ImportBackup, SaveToCloud, GetCredentialsPath,
} from "../wailsjs/go/main/App";
import { useAppStore } from "../stores/appStore";
import type { AppSettings, CloudSyncStatus, TimerProfile } from "../types";

export function SettingsPage() {
  const { settings, setSettings, timerProfiles, setTimerProfiles } = useAppStore();
  const [editingProfile, setEditingProfile] = useState<TimerProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<CloudSyncStatus | null>(null);
  const [credPath, setCredPath] = useState("");

  const reloadProfiles = useCallback(() => {
    GetTimerProfiles().then(setTimerProfiles).catch(console.error);
  }, [setTimerProfiles]);

  const reloadSettings = useCallback(() => {
    GetSettings().then(setSettings).catch(console.error);
  }, [setSettings]);

  useEffect(() => {
    reloadProfiles();
    reloadSettings();
    GetCredentialsPath().then(setCredPath).catch(console.error);
  }, [reloadProfiles, reloadSettings]);

  function handleSaveToCloud() {
    setSyncing(true);
    setSyncResult(null);
    SaveToCloud()
      .then((result) => { setSyncResult(result); reloadSettings(); })
      .catch((err) => setSyncResult({ docsCreated: 0, docsUpdated: 0, error: String(err), credsMissing: false }))
      .finally(() => setSyncing(false));
  }

  if (!settings) return null;

  function toggleBool(key: keyof AppSettings) {
    if (!settings) return;
    const updated = { ...settings, [key]: !(settings[key] as boolean) };
    setSettings(updated as AppSettings);
    UpdateSettings({
      theme: updated.theme,
      workFinishedSound: updated.workFinishedSound,
      breakFinishedSound: updated.breakFinishedSound,
      autoStartWork: updated.autoStartWork,
      autoStartBreak: updated.autoStartBreak,
      enableDesktopNotifications: updated.enableDesktopNotifications,
      cloudBackupEnabled: updated.cloudBackupEnabled,
      defaultTimerProfileName: updated.defaultTimerProfileName,
    }).catch(console.error);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="px-4 py-3 border-b border-surface-700">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </header>

      <div className="flex flex-col gap-6 p-4">
        {/* Timer Profiles */}
        <Section title="Timer Profiles">
          <ul className="divide-y divide-surface-700 rounded-xl overflow-hidden">
            {timerProfiles.map((p) => (
              <li key={p.name} className="flex items-center gap-3 px-4 py-3 bg-surface-800">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-gray-500 text-xs">
                    {p.workDuration}m focus · {p.breakDuration}m break
                    {p.isLongBreakEnabled ? ` · ${p.longBreakDuration}m long break` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setEditingProfile(p)}
                  className="text-gray-500 hover:text-white text-sm transition-colors"
                >
                  Edit
                </button>
                {p.name !== "72/5" && (
                  <button
                    onClick={() => DeleteTimerProfile(p.name).then(reloadProfiles).catch(console.error)}
                    className="text-red-500 hover:text-red-400 text-sm transition-colors"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setCreating(true)}
            className="mt-2 w-full py-2 rounded-xl bg-surface-700 hover:bg-surface-600 text-gray-300 text-sm transition-colors"
          >
            + New Profile
          </button>
        </Section>

        {/* Behaviour */}
        <Section title="Behaviour">
          <ToggleRow
            label="Auto-start work"
            description="Automatically start next focus session after break"
            checked={settings.autoStartWork}
            onChange={() => toggleBool("autoStartWork")}
          />
          <ToggleRow
            label="Auto-start break"
            description="Automatically start break after focus session"
            checked={settings.autoStartBreak}
            onChange={() => toggleBool("autoStartBreak")}
          />
          <ToggleRow
            label="Desktop notifications"
            description="Show notification when timer finishes"
            checked={settings.enableDesktopNotifications}
            onChange={() => toggleBool("enableDesktopNotifications")}
          />
        </Section>

        {/* Backup */}
        <Section title="Backup & Restore">
          <div className="flex gap-3">
            <button
              onClick={() => ExportBackup().catch(console.error)}
              className="flex-1 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => ImportBackup().then(reloadSettings).catch(console.error)}
              className="flex-1 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm transition-colors"
            >
              Import JSON
            </button>
          </div>

          {/* Cloud Sync */}
          <div className="mt-4">
            <button
              onClick={handleSaveToCloud}
              disabled={syncing}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors
                ${syncing
                  ? "bg-surface-600 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white"
                }`}
            >
              {syncing ? "Syncing…" : "Save to Cloud"}
            </button>

            {syncResult && (
              <div className={`mt-2 p-3 rounded-xl text-xs ${
                syncResult.error ? "bg-red-950 text-red-300" : "bg-green-950 text-green-300"
              }`}>
                {syncResult.error ? (
                  <>
                    <p className="font-semibold mb-1">Sync failed</p>
                    <p className="whitespace-pre-wrap break-words">{syncResult.error}</p>
                    {syncResult.credsMissing && (
                      <p className="mt-2 text-gray-400 break-all">Expected path: {credPath}</p>
                    )}
                  </>
                ) : (
                  <p>
                    Sync complete — {syncResult.docsCreated} created, {syncResult.docsUpdated} updated
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Theme */}
        <Section title="Appearance">
          <div className="flex gap-2">
            {(["dark", "light", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  const updated = { ...settings, theme: t };
                  setSettings(updated);
                  UpdateSettings({ ...updated }).catch(console.error);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                  ${settings.theme === t
                    ? "bg-brand-500 text-white"
                    : "bg-surface-700 text-gray-400 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {(creating || editingProfile) && (
        <ProfileModal
          initial={editingProfile ?? undefined}
          onSave={(p) => {
            SaveTimerProfile(p).then(reloadProfiles).catch(console.error);
            setEditingProfile(null);
            setCreating(false);
          }}
          onClose={() => { setEditingProfile(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-700 last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-white text-sm">{label}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
          ${checked ? "bg-brand-500" : "bg-surface-600"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

// ─── Profile modal ────────────────────────────────────────────────────────────

function ProfileModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: TimerProfile;
  onSave: (p: TimerProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TimerProfile>(
    initial ?? {
      name: "",
      isCountdown: true,
      workDuration: 72,
      isBreakEnabled: true,
      breakDuration: 5,
      isLongBreakEnabled: false,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      workBreakRatio: 3,
    }
  );

  function num(e: React.ChangeEvent<HTMLInputElement>, key: keyof TimerProfile) {
    setForm((f) => ({ ...f, [key]: parseInt(e.target.value, 10) || 0 }));
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl p-6 w-80 shadow-2xl overflow-y-auto max-h-[80vh]">
        <h2 className="text-white font-semibold mb-4">
          {initial ? "Edit Profile" : "New Profile"}
        </h2>
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!!initial && form.name === "72/5"}
              className="input"
              placeholder="e.g. 72/5"
            />
          </Field>
          <Field label="Focus duration (min)">
            <input type="number" value={form.workDuration} onChange={(e) => num(e, "workDuration")} className="input" min={1} />
          </Field>
          <Field label="Break duration (min)">
            <input type="number" value={form.breakDuration} onChange={(e) => num(e, "breakDuration")} className="input" min={1} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isLongBreakEnabled}
              onChange={(e) => setForm((f) => ({ ...f, isLongBreakEnabled: e.target.checked }))}
              className="accent-brand-500"
            />
            Enable long break
          </label>
          {form.isLongBreakEnabled && (
            <>
              <Field label="Long break (min)">
                <input type="number" value={form.longBreakDuration} onChange={(e) => num(e, "longBreakDuration")} className="input" min={1} />
              </Field>
              <Field label="Sessions before long break">
                <input type="number" value={form.sessionsBeforeLongBreak} onChange={(e) => num(e, "sessionsBeforeLongBreak")} className="input" min={1} />
              </Field>
            </>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (form.name) onSave(form); }}
              className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {children}
    </div>
  );
}
