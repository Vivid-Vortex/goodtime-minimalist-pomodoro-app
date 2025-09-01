import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  // Notifications
  enableNotifications: boolean;
  enableSounds: boolean;
  soundVolume: number; // 0-100
  
  // UI/UX
  theme: 'light' | 'dark' | 'auto';
  enableVibration: boolean;
  showSeconds: boolean;
  minimalistMode: boolean;
  timerDisplayFormat: 'minutes' | 'hours';
  
  // Timer Behavior
  autoStartBreaks: boolean;
  autoStartNextPomodoro: boolean;
  enableBreakBudget: boolean;
  longBreakAfterStreak: boolean;
  
  // Statistics
  startOfWeek: 'monday' | 'sunday';
  enableDailyGoals: boolean;
  dailyGoalMinutes: number;
  
  // Advanced
  enableKeyboardShortcuts: boolean;
  confirmBeforeDelete: boolean;
  enableAnalytics: boolean;
  dataRetentionDays: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  enableNotifications: true,
  enableSounds: true,
  soundVolume: 50,
  
  theme: 'auto',
  enableVibration: false,
  showSeconds: true,
  minimalistMode: false,
  timerDisplayFormat: 'minutes',
  
  autoStartBreaks: false,
  autoStartNextPomodoro: false,
  enableBreakBudget: false,
  longBreakAfterStreak: true,
  
  startOfWeek: 'monday',
  enableDailyGoals: true,
  dailyGoalMinutes: 120, // 2 hours default
  
  enableKeyboardShortcuts: true,
  confirmBeforeDelete: true,
  enableAnalytics: false,
  dataRetentionDays: 365
};

interface AppSettingsStore {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_APP_SETTINGS,

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates }
        }));
      },

      resetToDefaults: () => {
        set({ settings: { ...DEFAULT_APP_SETTINGS } });
      },

      exportSettings: () => {
        const { settings } = get();
        return JSON.stringify({
          exportDate: new Date().toISOString(),
          version: '1.0',
          settings
        }, null, 2);
      },

      importSettings: (settingsJson) => {
        try {
          const parsed = JSON.parse(settingsJson);
          if (parsed.settings && typeof parsed.settings === 'object') {
            // Validate and merge with defaults to ensure all properties exist
            const newSettings = { ...DEFAULT_APP_SETTINGS, ...parsed.settings };
            set({ settings: newSettings });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }
    }),
    {
      name: 'goodtime-app-settings-store'
    }
  )
);