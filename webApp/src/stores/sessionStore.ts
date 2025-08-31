import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, TimerType } from '../types';

interface SessionStore {
  sessions: Session[];
  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, updates: Partial<Omit<Session, 'id'>>) => void;
  deleteSession: (id: string) => void;
  clearSessions: () => void;
  exportSessions: () => string;
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

      addSession: (sessionData) => {
        const newSession: Session = {
          ...sessionData,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          sessions: [...state.sessions, newSession]
        }));
      },

      updateSession: (id, updates) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === id ? { ...session, ...updates } : session
          )
        }));
      },

      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter(session => session.id !== id)
        }));
      },

      clearSessions: () => {
        set({ sessions: [] });
      },

      exportSessions: () => {
        const { sessions } = get();
        const stats = get().getSessionStats();
        
        const exportData = {
          exportDate: new Date().toISOString(),
          totalSessions: stats.totalSessions,
          statistics: stats,
          sessions: sessions.map(session => ({
            id: session.id,
            label: session.label,
            timerType: session.timerType,
            duration: session.duration,
            endTime: new Date(session.endTime).toISOString(),
            archived: session.archived
          }))
        };
        
        return JSON.stringify(exportData, null, 2);
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