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
import { useSessionStore } from './sessionStore';
import { useLabelStore } from './labelStore';

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
  initialize: () => void;
  
  // Getters
  getActiveProfile: () => TimerProfile;
  
  // Internal
  tick: () => void;
  switchToNextTimer: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      state: TimerState.STOPPED,
      currentType: TimerType.FOCUS,
      timeRemaining: (DEFAULT_TIMER_PROFILE.workDuration || 72) * 60,
      totalTime: (DEFAULT_TIMER_PROFILE.workDuration || 72) * 60,
      isRunning: false,
      
      completedSessions: 0,
      currentSessionStartTime: 0,
      
      currentLabel: 'Work',

      getActiveProfile: () => {
        try {
          // Get the active profile from profile store
          const profileState = useProfileStore.getState();
          const profile = profileState.activeProfile || DEFAULT_TIMER_PROFILE;
          
          // Ensure all required properties have valid values
          return {
            ...DEFAULT_TIMER_PROFILE,
            ...profile,
            workDuration: profile.workDuration || DEFAULT_TIMER_PROFILE.workDuration || 72,
            breakDuration: profile.breakDuration || DEFAULT_TIMER_PROFILE.breakDuration || 5,
            longBreakDuration: profile.longBreakDuration || DEFAULT_TIMER_PROFILE.longBreakDuration || 15
          };
        } catch (error) {
          console.warn('Failed to get active profile, using default:', error);
          return {
            ...DEFAULT_TIMER_PROFILE,
            workDuration: 72,
            breakDuration: 5,
            longBreakDuration: 15
          };
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
        const { currentSessionStartTime, currentType } = get();
        
        // If there was an active session, save it as a partial session
        if (currentSessionStartTime > 0) {
          const sessionDuration = Math.floor((Date.now() - currentSessionStartTime) / 1000);
          
          // Only save if the session ran for at least 1 second
          if (sessionDuration > 0) {
            const sessionStore = useSessionStore.getState();
            // Get the current selected label ID from the label store
            const labelStore = useLabelStore.getState();
            sessionStore.addSession({
              label: labelStore.selectedLabel.id,
              timerType: currentType,
              duration: sessionDuration,
              endTime: Date.now(),
              archived: false
            }).catch(error => {
              console.error('Failed to save partial session:', error);
            });
          }
        }
        
        set({
          state: TimerState.STOPPED,
          isRunning: false,
          timeRemaining: get().totalTime,
          currentSessionStartTime: 0
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
          const timeInSeconds = duration * 60;
          
          // Safety check for valid time values
          if (isNaN(timeInSeconds) || timeInSeconds <= 0) {
            const defaultTime = 72 * 60; // 72 minutes default
            set({
              timeRemaining: defaultTime,
              totalTime: defaultTime
            });
          } else {
            set({
              timeRemaining: timeInSeconds,
              totalTime: timeInSeconds
            });
          }
        }
      },

      // Initialize timer with proper values
      initialize: () => {
        const { getActiveProfile, currentType } = get();
        const profile = getActiveProfile();
        const duration = getDurationForTimerType(profile, currentType);
        const timeInSeconds = duration * 60;
        
        // Safety check and set proper initial values
        if (isNaN(timeInSeconds) || timeInSeconds <= 0) {
          const defaultTime = 72 * 60; // 72 minutes default
          set({
            timeRemaining: defaultTime,
            totalTime: defaultTime
          });
        } else {
          set({
            timeRemaining: timeInSeconds,
            totalTime: timeInSeconds
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
          
          // Save completed session to database
          const { currentType, currentSessionStartTime } = get();
          const sessionDuration = Math.floor((Date.now() - currentSessionStartTime) / 1000);
          
          // Save to session store
          const sessionStore = useSessionStore.getState();
          // Get the current selected label ID from the label store
          const labelStore = useLabelStore.getState();
          sessionStore.addSession({
            label: labelStore.selectedLabel.id,
            timerType: currentType,
            duration: sessionDuration,
            endTime: Date.now(),
            archived: false
          }).catch(error => {
            console.error('Failed to save session:', error);
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