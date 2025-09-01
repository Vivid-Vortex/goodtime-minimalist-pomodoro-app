import React, { useState } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Moon, 
  Sun, 
  Monitor,
  Keyboard,
  Download,
  Upload,
  RotateCcw,
  Shield,
  Target,
  Calendar
} from 'lucide-react';
import { useAppSettingsStore, DEFAULT_APP_SETTINGS } from '../stores/appSettingsStore';

interface AdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetToDefaults, exportSettings, importSettings } = useAppSettingsStore();
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = importSettings(content);
        if (success) {
          setImportError(null);
          alert('Settings imported successfully!');
        } else {
          setImportError('Invalid settings file format');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  };

  const handleExportSettings = () => {
    const settingsData = exportSettings();
    const blob = new Blob([settingsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goodtime_settings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      resetToDefaults();
    }
  };

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const SliderInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    label: string;
    unit?: string;
  }> = ({ value, onChange, min, max, label, unit = '' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}: {value}{unit}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Advanced Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Notifications & Sounds */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Bell size={20} />
              Notifications & Sounds
            </h3>
            
            <ToggleSwitch
              enabled={settings.enableNotifications}
              onChange={(enabled) => updateSettings({ enableNotifications: enabled })}
              label="Browser Notifications"
              description="Show notifications when timers complete"
            />
            
            <ToggleSwitch
              enabled={settings.enableSounds}
              onChange={(enabled) => updateSettings({ enableSounds: enabled })}
              label="Sound Alerts"
              description="Play sound when timers finish"
            />
            
            {settings.enableSounds && (
              <SliderInput
                value={settings.soundVolume}
                onChange={(volume) => updateSettings({ soundVolume: volume })}
                min={0}
                max={100}
                label="Sound Volume"
                unit="%"
              />
            )}
            
            <ToggleSwitch
              enabled={settings.enableVibration}
              onChange={(enabled) => updateSettings({ enableVibration: enabled })}
              label="Vibration (Mobile)"
              description="Vibrate on mobile devices when available"
            />
          </div>

          {/* Appearance */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Monitor size={20} />
              Appearance
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    settings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Sun size={16} />
                  Light
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    settings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Moon size={16} />
                  Dark
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'auto' })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    settings.theme === 'auto'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Monitor size={16} />
                  Auto
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timer Display Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ timerDisplayFormat: 'minutes' })}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    settings.timerDisplayFormat === 'minutes'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Minutes Only
                </button>
                <button
                  onClick={() => updateSettings({ timerDisplayFormat: 'hours' })}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    settings.timerDisplayFormat === 'hours'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Hours:Minutes
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minutes Only: "72" or "72:45" | Hours:Minutes: "01:12:00" or "25:00"
              </p>
            </div>
            
            <ToggleSwitch
              enabled={settings.showSeconds}
              onChange={(enabled) => updateSettings({ showSeconds: enabled })}
              label="Show Seconds"
              description="Display seconds in timer countdown"
            />
            
            <ToggleSwitch
              enabled={settings.minimalistMode}
              onChange={(enabled) => updateSettings({ minimalistMode: enabled })}
              label="Minimalist Mode"
              description="Hide extra UI elements for distraction-free focus"
            />
          </div>

          {/* Timer Behavior */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target size={20} />
              Timer Behavior
            </h3>
            
            <ToggleSwitch
              enabled={settings.autoStartBreaks}
              onChange={(enabled) => updateSettings({ autoStartBreaks: enabled })}
              label="Auto-start Breaks"
              description="Automatically start break timers"
            />
            
            <ToggleSwitch
              enabled={settings.autoStartNextPomodoro}
              onChange={(enabled) => updateSettings({ autoStartNextPomodoro: enabled })}
              label="Auto-start Next Session"
              description="Start next focus session after break"
            />
            
            <ToggleSwitch
              enabled={settings.enableBreakBudget}
              onChange={(enabled) => updateSettings({ enableBreakBudget: enabled })}
              label="Break Budget"
              description="Allow accumulated break time for flexible scheduling"
            />
            
            <ToggleSwitch
              enabled={settings.longBreakAfterStreak}
              onChange={(enabled) => updateSettings({ longBreakAfterStreak: enabled })}
              label="Long Break After Streak"
              description="Trigger long breaks after configured session count"
            />
          </div>

          {/* Statistics & Goals */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={20} />
              Statistics & Goals
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start of Week</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ startOfWeek: 'monday' })}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    settings.startOfWeek === 'monday'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Monday
                </button>
                <button
                  onClick={() => updateSettings({ startOfWeek: 'sunday' })}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    settings.startOfWeek === 'sunday'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sunday
                </button>
              </div>
            </div>
            
            <ToggleSwitch
              enabled={settings.enableDailyGoals}
              onChange={(enabled) => updateSettings({ enableDailyGoals: enabled })}
              label="Daily Goals"
              description="Set and track daily focus time goals"
            />
            
            {settings.enableDailyGoals && (
              <SliderInput
                value={settings.dailyGoalMinutes}
                onChange={(minutes) => updateSettings({ dailyGoalMinutes: minutes })}
                min={15}
                max={480}
                label="Daily Goal"
                unit=" minutes"
              />
            )}
          </div>

          {/* Privacy & Data */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Shield size={20} />
              Privacy & Data
            </h3>
            
            <ToggleSwitch
              enabled={settings.confirmBeforeDelete}
              onChange={(enabled) => updateSettings({ confirmBeforeDelete: enabled })}
              label="Confirm Deletions"
              description="Show confirmation dialogs before deleting data"
            />
            
            <ToggleSwitch
              enabled={settings.enableAnalytics}
              onChange={(enabled) => updateSettings({ enableAnalytics: enabled })}
              label="Anonymous Analytics"
              description="Help improve the app with anonymous usage data"
            />
            
            <SliderInput
              value={settings.dataRetentionDays}
              onChange={(days) => updateSettings({ dataRetentionDays: days })}
              min={30}
              max={1095}
              label="Data Retention"
              unit=" days"
            />
          </div>

          {/* Advanced Features */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Keyboard size={20} />
              Advanced Features
            </h3>
            
            <ToggleSwitch
              enabled={settings.enableKeyboardShortcuts}
              onChange={(enabled) => updateSettings({ enableKeyboardShortcuts: enabled })}
              label="Keyboard Shortcuts"
              description="Enable keyboard shortcuts for timer control"
            />
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <strong>Shortcuts:</strong> Space = Play/Pause, S = Stop, R = Reset, + = Add 60s
            </div>
          </div>
        </div>

        {/* Import/Export & Reset */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Backup & Reset</h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={16} />
              Export Settings
            </button>
            
            <label className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
              <Upload size={16} />
              Import Settings
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleResetSettings}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
          </div>
          
          {importError && (
            <p className="text-red-600 text-sm mt-2">{importError}</p>
          )}
        </div>
      </div>
    </div>
  );
};