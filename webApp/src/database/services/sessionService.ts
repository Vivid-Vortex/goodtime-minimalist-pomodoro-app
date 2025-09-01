import DatabaseManager from '../database';
import { Session, TimerType } from '../../types';

export class SessionService {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  async addSession(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const newSession: Session = {
      ...sessionData,
      id: crypto.randomUUID(),
    };

    await this.db.insertSession({
      id: newSession.id,
      labelId: newSession.label,
      timerType: newSession.timerType,
      duration: newSession.duration,
      endTime: newSession.endTime,
      archived: newSession.archived
    });

    return newSession;
  }

  async updateSession(id: string, updates: Partial<Omit<Session, 'id'>>): Promise<void> {
    const dbUpdates: any = {};
    
    if (updates.label !== undefined) dbUpdates.labelId = updates.label;
    if (updates.timerType !== undefined) dbUpdates.timerType = updates.timerType;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.endTime !== undefined) dbUpdates.endTime = updates.endTime;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

    await this.db.updateSession(id, dbUpdates);
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.deleteSession(id);
  }

  async getAllSessions(): Promise<Session[]> {
    const dbSessions = await this.db.getAllSessions();
    
    return dbSessions.map(session => ({
      id: session.id,
      label: session.label_id || 'default',
      timerType: session.timer_type as TimerType,
      duration: session.duration,
      endTime: session.end_time,
      archived: Boolean(session.archived)
    }));
  }

  async clearSessions(): Promise<void> {
    // Get all session IDs first
    const sessions = await this.getAllSessions();
    
    // Delete each session
    for (const session of sessions) {
      await this.db.deleteSession(session.id);
    }
  }

  async getSessionStats() {
    return await this.db.getSessionStats();
  }

  async exportSessions(): Promise<string> {
    return await this.db.exportData();
  }
}

export const sessionService = new SessionService();