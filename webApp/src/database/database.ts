import IndexedDBManager from './indexedDBManager';

class DatabaseManager {
  private indexedDB: IndexedDBManager;
  private static instance: DatabaseManager;

  private constructor() {
    this.indexedDB = new IndexedDBManager();
    this.initialize();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await this.indexedDB.initialize();
      
      // Ensure default data exists
      await this.ensureDefaultData();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async ensureDefaultData(): Promise<void> {
    try {
      // Check if default label exists
      const labels = await this.indexedDB.getAllLabels();
      if (labels.length === 0) {
        await this.indexedDB.insertLabel({
          id: 'default',
          title: 'Default',
          color: 0,
          archived: false,
          orderIndex: 0
        });
      }

      // Check if default profile exists
      const profiles = await this.indexedDB.getAllTimerProfiles();
      if (profiles.length === 0) {
        await this.indexedDB.insertTimerProfile({
          name: '25/5',
          isCountdown: true,
          workDuration: 25,
          isBreakEnabled: true,
          breakDuration: 5,
          isLongBreakEnabled: false,
          longBreakDuration: 15,
          sessionsBeforeLongBreak: 4,
          workBreakRatio: 3
        });
      }
    } catch (error) {
      console.error('Failed to ensure default data:', error);
    }
  }

  // Session methods
  public insertSession(session: {
    id: string;
    labelId?: string;
    timerType: string;
    duration: number;
    endTime: number;
    archived?: boolean;
    notes?: string;
  }): Promise<void> {
    return this.indexedDB.insertSession(session);
  }

  public updateSession(id: string, updates: {
    labelId?: string;
    timerType?: string;
    duration?: number;
    endTime?: number;
    archived?: boolean;
    notes?: string;
  }): Promise<void> {
    return this.indexedDB.updateSession(id, updates);
  }

  public deleteSession(id: string): Promise<void> {
    return this.indexedDB.deleteSession(id);
  }

  public getAllSessions(): Promise<any[]> {
    return this.indexedDB.getAllSessions();
  }

  public getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    return this.indexedDB.getSessionStats();
  }

  // Label methods
  public insertLabel(label: {
    id: string;
    title: string;
    color: number;
    archived?: boolean;
    orderIndex: number;
  }): Promise<void> {
    return this.indexedDB.insertLabel(label);
  }

  public updateLabel(id: string, updates: {
    title?: string;
    color?: number;
    archived?: boolean;
    orderIndex?: number;
  }): Promise<void> {
    return this.indexedDB.updateLabel(id, updates);
  }

  public deleteLabel(id: string): Promise<void> {
    return this.indexedDB.deleteLabel(id);
  }

  public getAllLabels(): Promise<any[]> {
    return this.indexedDB.getAllLabels();
  }

  // Timer profile methods
  public insertTimerProfile(profile: {
    name: string;
    isCountdown?: boolean;
    workDuration: number;
    isBreakEnabled?: boolean;
    breakDuration: number;
    isLongBreakEnabled?: boolean;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    workBreakRatio: number;
  }): Promise<void> {
    return this.indexedDB.insertTimerProfile(profile);
  }

  public updateTimerProfile(name: string, updates: any): Promise<void> {
    return this.indexedDB.updateTimerProfile(name, updates);
  }

  public deleteTimerProfile(name: string): Promise<void> {
    return this.indexedDB.deleteTimerProfile(name);
  }

  public getAllTimerProfiles(): Promise<any[]> {
    return this.indexedDB.getAllTimerProfiles();
  }

  // App settings methods
  public getSetting(key: string): Promise<string | null> {
    return this.indexedDB.getSetting(key);
  }

  public setSetting(key: string, value: string): Promise<void> {
    return this.indexedDB.setSetting(key, value);
  }

  // Export/Import methods
  public exportData(): Promise<string> {
    return this.indexedDB.exportData();
  }

  public clearAllData(): Promise<void> {
    return this.indexedDB.clearAllData();
  }
}

export default DatabaseManager;