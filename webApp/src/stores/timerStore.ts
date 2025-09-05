import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  TimerState, 
  TimerType, 
  TimerProfile, 
  DEFAULT_TIMER_PROFILE
} from '../types';
import { 
  getDurationForTimerType, 
  getNextTimerType, 
  playNotificationSound, 
  showNotification,
  getTimerTypeLabel 
} from '../utils/timer';
import { useProfileStore } from './profileStore';

interface TimerStore {
  // Timer state
  state: TimerState;
  currentType: TimerType;
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  
  // Session tracking
  completedSessions: number;
  currentSessionStartTime: number;
  
  // Settings
  currentLabel: string;
  
  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  reset: () => void;
  addTime: (seconds: number) => void;
  setLabel: (label: string) => void;
  syncWithActiveProfile: () => void;
  
  // Getters
  getActiveProfile: () => TimerProfile;
  
  // Internal
  tick: () => void;
  switchToNextTimer: () => void;
}

let timerInterval: number | null = null;

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      state: TimerState.STOPPED,
      currentType: TimerType.FOCUS,
      timeRemaining: DEFAULT_TIMER_PROFILE.workDuration * 60,
      totalTime: DEFAULT_TIMER_PROFILE.workDuration * 60,
      isRunning: false,
      
      completedSessions: 0,
      currentSessionStartTime: 0,
      
      currentLabel: 'Work',

      getActiveProfile: () => {
        try {
          // Get the active profile from profile store
          const profileState = useProfileStore.getState();
          return profileState.activeProfile || DEFAULT_TIMER_PROFILE;
        } catch (error) {
          console.warn('Failed to get active profile, using default:', error);
          return DEFAULT_TIMER_PROFILE;
        }
      },

      start: () => {
        const { state, currentType, getActiveProfile } = get();
        const profile = getActiveProfile();
        
        if (state === TimerState.STOPPED) {
          const duration = getDurationForTimerType(profile, currentType);
          set({
            state: TimerState.RUNNING,
            timeRemaining: duration * 60,
            totalTime: duration * 60,
            isRunning: true,
            currentSessionStartTime: Date.now()
          });
        } else {
          set({
            state: TimerState.RUNNING,
            isRunning: true
          });
        }

        // Start the timer interval
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        timerInterval = setInterval(() => {
          get().tick();
        }, 1000);
      },

      pause: () => {
        set({
          state: TimerState.PAUSED,
          isRunning: false
        });
        
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      },

      resume: () => {
        get().start();
      },

      stop: () => {
        set({
          state: TimerState.STOPPED,
          isRunning: false,
          timeRemaining: get().totalTime
        });
        
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      },

      skip: () => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        
        get().switchToNextTimer();
      },

      reset: () => {
        const { getActiveProfile } = get();
        const profile = getActiveProfile();
        
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        
        const duration = getDurationForTimerType(profile, TimerType.FOCUS);
        set({
          state: TimerState.STOPPED,
          currentType: TimerType.FOCUS,
          timeRemaining: duration * 60,
          totalTime: duration * 60,
          isRunning: false,
          completedSessions: 0,
          currentSessionStartTime: 0
        });
      },

      addTime: (seconds) => {
        const { timeRemaining, totalTime } = get();
        const newTimeRemaining = timeRemaining + seconds;
        const newTotalTime = Math.max(totalTime, newTimeRemaining);
        
        set({
          timeRemaining: Math.max(0, newTimeRemaining),
          totalTime: newTotalTime
        });
      },

      // Note: updateProfile removed - use profile store directly

      setLabel: (label: string) => {
        set({ currentLabel: label });
      },

      syncWithActiveProfile: () => {
        const { getActiveProfile, state, currentType } = get();
        const profile = getActiveProfile();
        
        // Only update if timer is stopped (don't interrupt running timer)
        if (state === TimerState.STOPPED) {
          const duration = getDurationForTimerType(profile, currentType);
          set({
            timeRemaining: duration * 60,
            totalTime: duration * 60
          });
        }
      },

      tick: () => {
        const { timeRemaining, isRunning } = get();
        
        if (!isRunning || timeRemaining <= 0) {
          return;
        }

        const newTimeRemaining = timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          // Timer finished
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          
          // Save completed session (simplified for now)
          const { currentType, totalTime, currentLabel } = get();
          console.log('Session completed:', {
            label: currentLabel,
            timerType: currentType,
            duration: totalTime,
            endTime: Date.now()
          });
          
          playNotificationSound();
          
          const typeLabel = getTimerTypeLabel(currentType);
          showNotification(
            `${typeLabel} completed!`,
            currentType === TimerType.FOCUS 
              ? 'Great work! Time for a break.' 
              : 'Break over! Ready to focus again?'
          );
          
          get().switchToNextTimer();
        } else {
          set({ timeRemaining: newTimeRemaining });
        }
      },

      switchToNextTimer: () => {
        const { currentType, completedSessions, getActiveProfile } = get();
        const profile = getActiveProfile();
        let newCompletedSessions = completedSessions;
        
        if (currentType === TimerType.FOCUS) {
          newCompletedSessions++;
        }
        
        const nextType = getNextTimerType(currentType, profile, newCompletedSessions);
        const duration = getDurationForTimerType(profile, nextType);
        
        set({
          state: TimerState.STOPPED,
          currentType: nextType,
          timeRemaining: duration * 60,
          totalTime: duration * 60,
          isRunning: false,
          completedSessions: newCompletedSessions,
          currentSessionStartTime: 0
        });
      }
    }),
    {
      name: 'goodtime-timer-store',
      partialize: (state) => ({
        completedSessions: state.completedSessions,
        currentLabel: state.currentLabel
      })
    }
  )
);