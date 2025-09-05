import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimerProfile, DEFAULT_TIMER_PROFILE } from '../types';
import { profileService } from '../database/services/profileService';

export interface TimerProfileWithId extends TimerProfile {
  id: string;
  createdAt: number;
}

export const PRESET_PROFILES: (Omit<TimerProfileWithId, 'id' | 'createdAt'> & { name: string })[] = [
  {
    name: '25/5 Classic',
    isCountdown: true,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    isBreakEnabled: true,
    isLongBreakEnabled: true,
    workBreakRatio: 3
  },
  {
    name: '45/15 Extended',
    isCountdown: true,
    workDuration: 45,
    breakDuration: 15,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 3,
    isBreakEnabled: true,
    isLongBreakEnabled: true,
    workBreakRatio: 3
  },
  {
    name: '90/20 Deep Work',
    isCountdown: true,
    workDuration: 90,
    breakDuration: 20,
    longBreakDuration: 45,
    sessionsBeforeLongBreak: 2,
    isBreakEnabled: true,
    isLongBreakEnabled: true,
    workBreakRatio: 4
  },
  {
    name: '50/10 Ultradian',
    isCountdown: true,
    workDuration: 50,
    breakDuration: 10,
    longBreakDuration: 25,
    sessionsBeforeLongBreak: 3,
    isBreakEnabled: true,
    isLongBreakEnabled: true,
    workBreakRatio: 5
  },
  {
    name: 'Flow State',
    isCountdown: false,
    workDuration: 25, // Not used in stopwatch mode
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    isBreakEnabled: true,
    isLongBreakEnabled: false,
    workBreakRatio: 3
  }
];

interface ProfileStore {
  profiles: TimerProfileWithId[];
  activeProfile: TimerProfileWithId;
  isLoading: boolean;
  
  // Actions
  loadProfiles: () => Promise<void>;
  addProfile: (profile: Omit<TimerProfile, 'name'> & { name: string }) => Promise<void>;
  updateProfile: (name: string, updates: Partial<TimerProfile>) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  setActiveProfile: (name: string) => void;
  duplicateProfile: (name: string, newName: string) => Promise<void>;
  resetToPresets: () => Promise<void>;
  
  // Getters
  getProfileByName: (name: string) => TimerProfileWithId | undefined;
}

const DEFAULT_PROFILE_WITH_ID: TimerProfileWithId = {
  ...DEFAULT_TIMER_PROFILE,
  id: 'default',
  createdAt: Date.now()
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [DEFAULT_PROFILE_WITH_ID],
      activeProfile: DEFAULT_PROFILE_WITH_ID,
      isLoading: false,

      loadProfiles: async () => {
        set({ isLoading: true });
        try {
          const dbProfiles = await profileService.getAllProfiles();
          const profiles: TimerProfileWithId[] = dbProfiles.map(profile => ({
            ...profile,
            id: crypto.randomUUID(), // Generate client-side ID for compatibility
            createdAt: Date.now()
          }));

          const activeProfiles = profiles.length > 0 ? profiles : [DEFAULT_PROFILE_WITH_ID];
          set({ 
            profiles: activeProfiles, 
            activeProfile: activeProfiles[0],
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to load profiles:', error);
          set({ isLoading: false });
        }
      },

      addProfile: async (profileData) => {
        try {
          await profileService.addProfile(profileData);
          const newProfile: TimerProfileWithId = {
            ...profileData,
            id: crypto.randomUUID(),
            createdAt: Date.now()
          };
          
          set((state) => ({
            profiles: [...state.profiles, newProfile]
          }));
        } catch (error) {
          console.error('Failed to add profile:', error);
          throw error;
        }
      },

      updateProfile: async (name, updates) => {
        try {
          await profileService.updateProfile(name, updates);
          set((state) => {
            const updatedProfiles = state.profiles.map(profile => 
              profile.name === name ? { ...profile, ...updates } : profile
            );
            
            const updatedActiveProfile = state.activeProfile.name === name 
              ? { ...state.activeProfile, ...updates }
              : state.activeProfile;

            return {
              profiles: updatedProfiles,
              activeProfile: updatedActiveProfile
            };
          });
        } catch (error) {
          console.error('Failed to update profile:', error);
          throw error;
        }
      },

      deleteProfile: async (name) => {
        if (name === '25/5') return; // Can't delete default profile
        
        try {
          await profileService.deleteProfile(name);
          const { profiles, activeProfile } = get();
          const updatedProfiles = profiles.filter(profile => profile.name !== name);
          
          set({
            profiles: updatedProfiles,
            activeProfile: activeProfile.name === name 
              ? profiles.find(p => p.name === '25/5') || DEFAULT_PROFILE_WITH_ID
              : activeProfile
          });
        } catch (error) {
          console.error('Failed to delete profile:', error);
          throw error;
        }
      },

      setActiveProfile: (name) => {
        const profile = get().profiles.find(p => p.name === name);
        if (profile) {
          set({ activeProfile: profile });
        }
      },

      duplicateProfile: async (name, newName) => {
        const profile = get().profiles.find(p => p.name === name);
        if (profile) {
          try {
            const duplicatedData = {
              ...profile,
              name: newName
            };
            await profileService.addProfile(duplicatedData);
            
            const duplicated: TimerProfileWithId = {
              ...duplicatedData,
              id: crypto.randomUUID(),
              createdAt: Date.now()
            };
            
            set((state) => ({
              profiles: [...state.profiles, duplicated]
            }));
          } catch (error) {
            console.error('Failed to duplicate profile:', error);
            throw error;
          }
        }
      },

      resetToPresets: async () => {
        try {
          // Clear existing profiles in database
          await profileService.clearProfiles();
          
          // Add preset profiles to database
          for (const preset of PRESET_PROFILES) {
            await profileService.addProfile(preset);
          }
          
          const presetProfiles: TimerProfileWithId[] = [
            DEFAULT_PROFILE_WITH_ID,
            ...PRESET_PROFILES.map(preset => ({
              ...preset,
              id: crypto.randomUUID(),
              createdAt: Date.now()
            }))
          ];
          
          set({
            profiles: presetProfiles,
            activeProfile: DEFAULT_PROFILE_WITH_ID
          });
        } catch (error) {
          console.error('Failed to reset to presets:', error);
          throw error;
        }
      },

      getProfileByName: (name) => {
        return get().profiles.find(p => p.name === name);
      }
    }),
    {
      name: 'goodtime-profiles-store'
    }
  )
);