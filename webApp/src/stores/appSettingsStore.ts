import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DatabaseManager from '../database/database';

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
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  loadSettingsFromCloud: () => Promise<void>;
}

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_APP_SETTINGS,

      updateSettings: async (updates) => {
        const newSettings = { ...get().settings, ...updates };
        
        // Update local state immediately
        set({ settings: newSettings });
        
        // Sync to cloud database
        try {
          const dbManager = DatabaseManager.getInstance();
          if (dbManager.isCloudConnected()) {
            // Save each setting to cloud database
            for (const [key, value] of Object.entries(updates)) {
              await dbManager.setSetting(`appSettings.${key}`, JSON.stringify(value));
            }
            console.log('Settings synced to cloud:', Object.keys(updates));
          }
        } catch (error) {
          console.warn('Failed to sync settings to cloud:', error);
          // Don't revert local changes - they're still saved locally
        }
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
      },

      loadSettingsFromCloud: async () => {
        try {
          const dbManager = DatabaseManager.getInstance();
          if (!dbManager.isCloudConnected()) {
            return;
          }

          const cloudSettings: Partial<AppSettings> = {};
          const settingKeys = Object.keys(DEFAULT_APP_SETTINGS) as Array<keyof AppSettings>;

          // Load each setting from cloud
          for (const key of settingKeys) {
            try {
              const value = await dbManager.getSetting(`appSettings.${key}`);
              if (value !== null) {
                cloudSettings[key] = JSON.parse(value) as any;
              }
            } catch (error) {
              console.warn(`Failed to load setting ${key} from cloud:`, error);
            }
          }

          // Merge cloud settings with current settings
          if (Object.keys(cloudSettings).length > 0) {
            const mergedSettings = { ...get().settings, ...cloudSettings };
            set({ settings: mergedSettings });
            console.log('Loaded settings from cloud:', Object.keys(cloudSettings));
          }
        } catch (error) {
          console.warn('Failed to load settings from cloud:', error);
        }
      }
    }),
    {
      name: 'goodtime-app-settings-store'
    }
  )
);