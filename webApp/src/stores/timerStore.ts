import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  TimerState, 
  TimerType, 
  TimerProfile, 
  DEFAULT_TIMER_PROFILE,
  Session 
} from '../types';
import { 
  getDurationForTimerType, 
  getNextTimerType, 
  playNotificationSound, 
  showNotification,
  getTimerTypeLabel 
} from '../utils/timer';
import { useSessionStore } from './sessionStore';

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
  
  // Profile and settings
  profile: TimerProfile;
  currentLabel: string;
  
  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  reset: () => void;
  updateProfile: (profile: Partial<TimerProfile>) => void;
  setLabel: (label: string) => void;
  
  // Internal
  tick: () => void;
  switchToNextTimer: () => void;
}

let timerInterval: NodeJS.Timeout | null = null;

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
      
      profile: DEFAULT_TIMER_PROFILE,
      currentLabel: 'Work',

      start: () => {
        const { state, profile, currentType } = get();
        
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
        const { profile } = get();
        
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

      updateProfile: (newProfile: Partial<TimerProfile>) => {
        const { profile, currentType } = get();
        const updatedProfile = { ...profile, ...newProfile };
        const duration = getDurationForTimerType(updatedProfile, currentType);
        
        set({
          profile: updatedProfile,
          timeRemaining: duration * 60,
          totalTime: duration * 60
        });
      },

      setLabel: (label: string) => {
        set({ currentLabel: label });
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
          
          // Save completed session
          const { currentType, totalTime, currentLabel, currentSessionStartTime } = get();
          useSessionStore.getState().addSession({
            label: currentLabel,
            timerType: currentType,
            duration: totalTime,
            endTime: Date.now(),
            archived: false
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
        const { currentType, profile, completedSessions } = get();
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
        profile: state.profile,
        completedSessions: state.completedSessions,
        currentLabel: state.currentLabel
      })
    }
  )
);