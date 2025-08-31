import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimerProfile, DEFAULT_TIMER_PROFILE } from '../types';

export interface TimerProfileWithId extends TimerProfile {
  id: string;
  createdAt: number;
}

export const PRESET_PROFILES: Omit<TimerProfileWithId, 'id' | 'createdAt'>[] = [
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
  
  // Actions
  addProfile: (profile: Omit<TimerProfile, 'name'> & { name: string }) => void;
  updateProfile: (id: string, updates: Partial<TimerProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  duplicateProfile: (id: string, newName: string) => void;
  resetToPresets: () => void;
  
  // Getters
  getProfileById: (id: string) => TimerProfileWithId | undefined;
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

      addProfile: (profileData) => {
        const newProfile: TimerProfileWithId = {
          ...profileData,
          id: crypto.randomUUID(),
          createdAt: Date.now()
        };
        
        set((state) => ({
          profiles: [...state.profiles, newProfile]
        }));
      },

      updateProfile: (id, updates) => {
        set((state) => {
          const updatedProfiles = state.profiles.map(profile => 
            profile.id === id ? { ...profile, ...updates } : profile
          );
          
          const updatedActiveProfile = state.activeProfile.id === id 
            ? { ...state.activeProfile, ...updates }
            : state.activeProfile;

          return {
            profiles: updatedProfiles,
            activeProfile: updatedActiveProfile
          };
        });
      },

      deleteProfile: (id) => {
        if (id === 'default') return; // Can't delete default profile
        
        const { profiles, activeProfile } = get();
        const updatedProfiles = profiles.filter(profile => profile.id !== id);
        
        set({
          profiles: updatedProfiles,
          activeProfile: activeProfile.id === id 
            ? profiles.find(p => p.id === 'default') || DEFAULT_PROFILE_WITH_ID
            : activeProfile
        });
      },

      setActiveProfile: (id) => {
        const profile = get().profiles.find(p => p.id === id);
        if (profile) {
          set({ activeProfile: profile });
        }
      },

      duplicateProfile: (id, newName) => {
        const profile = get().profiles.find(p => p.id === id);
        if (profile) {
          const duplicated: TimerProfileWithId = {
            ...profile,
            id: crypto.randomUUID(),
            name: newName,
            createdAt: Date.now()
          };
          
          set((state) => ({
            profiles: [...state.profiles, duplicated]
          }));
        }
      },

      resetToPresets: () => {
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
      },

      getProfileById: (id) => {
        return get().profiles.find(p => p.id === id);
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