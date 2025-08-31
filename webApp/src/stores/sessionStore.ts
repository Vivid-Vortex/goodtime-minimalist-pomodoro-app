import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, TimerType } from '../types';
import { sessionService } from '../database/services/sessionService';

interface SessionStore {
  sessions: Session[];
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  addSession: (session: Omit<Session, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<Omit<Session, 'id'>>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearSessions: () => Promise<void>;
  exportSessions: () => Promise<string>;
  getSessionStats: () => {
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      isLoading: false,

      loadSessions: async () => {
        set({ isLoading: true });
        try {
          const sessions = await sessionService.getAllSessions();
          set({ sessions, isLoading: false });
        } catch (error) {
          console.error('Failed to load sessions:', error);
          set({ isLoading: false });
        }
      },

      addSession: async (sessionData) => {
        try {
          const newSession = await sessionService.addSession(sessionData);
          set((state) => ({
            sessions: [...state.sessions, newSession]
          }));
        } catch (error) {
          console.error('Failed to add session:', error);
          throw error;
        }
      },

      updateSession: async (id, updates) => {
        try {
          await sessionService.updateSession(id, updates);
          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === id ? { ...session, ...updates } : session
            )
          }));
        } catch (error) {
          console.error('Failed to update session:', error);
          throw error;
        }
      },

      deleteSession: async (id) => {
        try {
          await sessionService.deleteSession(id);
          set((state) => ({
            sessions: state.sessions.filter(session => session.id !== id)
          }));
        } catch (error) {
          console.error('Failed to delete session:', error);
          throw error;
        }
      },

      clearSessions: async () => {
        try {
          await sessionService.clearSessions();
          set({ sessions: [] });
        } catch (error) {
          console.error('Failed to clear sessions:', error);
          throw error;
        }
      },

      exportSessions: async () => {
        try {
          return await sessionService.exportSessions();
        } catch (error) {
          console.error('Failed to export sessions:', error);
          throw error;
        }
      },

      getSessionStats: () => {
        const { sessions } = get();
        
        const focusSessions = sessions.filter(s => s.timerType === TimerType.FOCUS);
        const breakSessions = sessions.filter(s => s.timerType === TimerType.BREAK || s.timerType === TimerType.LONG_BREAK);
        
        const totalFocusTime = focusSessions.reduce((acc, s) => acc + s.duration, 0);
        const totalBreakTime = breakSessions.reduce((acc, s) => acc + s.duration, 0);
        
        return {
          totalSessions: sessions.length,
          focusSessions: focusSessions.length,
          breakSessions: breakSessions.length,
          totalFocusTime,
          totalBreakTime,
          averageSessionDuration: sessions.length > 0 ? 
            sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length : 0
        };
      }
    }),
    {
      name: 'goodtime-sessions-store'
    }
  )
);