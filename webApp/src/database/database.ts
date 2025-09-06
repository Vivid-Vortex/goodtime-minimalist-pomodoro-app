// Main database manager - now uses Express API backend instead of IndexedDB
import APIDatabaseManager from './apiDatabaseManager';

class DatabaseManager {
  private apiDB: APIDatabaseManager;
  private static instance: DatabaseManager;

  private constructor() {
    console.log('🏗️ DatabaseManager: Initializing with APIDatabaseManager');
    this.apiDB = APIDatabaseManager.getInstance();
    console.log('🏗️ DatabaseManager: APIDatabaseManager instance created');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // Session methods - delegate to API database
  public async insertSession(session: {
    id: string;
    label?: string;
    timerType: string;
    duration: number;
    endTime: number;
    archived?: boolean;
    notes?: string;
    interruptions?: number;
  }): Promise<void> {
    return this.apiDB.insertSession(session);
  }

  public async updateSession(id: string, updates: {
    label?: string;
    timerType?: string;
    duration?: number;
    endTime?: number;
    archived?: boolean;
    notes?: string;
    interruptions?: number;
  }): Promise<void> {
    return this.apiDB.updateSession(id, updates);
  }

  public async deleteSession(id: string): Promise<void> {
    return this.apiDB.deleteSession(id);
  }

  public async getAllSessions(): Promise<any[]> {
    return this.apiDB.getAllSessions();
  }

  public async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    return this.apiDB.getSessionStats();
  }

  // Label methods - delegate to API database
  public async insertLabel(label: {
    id: string;
    title: string;
    color: number;
    archived?: boolean;
    orderIndex: number;
  }): Promise<void> {
    return this.apiDB.insertLabel(label);
  }

  public async updateLabel(id: string, updates: {
    title?: string;
    color?: number;
    archived?: boolean;
    orderIndex?: number;
  }): Promise<void> {
    return this.apiDB.updateLabel(id, updates);
  }

  public async deleteLabel(id: string): Promise<void> {
    return this.apiDB.deleteLabel(id);
  }

  public async getAllLabels(): Promise<any[]> {
    console.log('🏷️ DatabaseManager: getAllLabels() called, using API database');
    return this.apiDB.getAllLabels();
  }

  // Timer profile methods - delegate to API database
  public async insertTimerProfile(profile: {
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
    return this.apiDB.insertTimerProfile(profile);
  }

  public async updateTimerProfile(name: string, updates: any): Promise<void> {
    return this.apiDB.updateTimerProfile(name, updates);
  }

  public async deleteTimerProfile(name: string): Promise<void> {
    return this.apiDB.deleteTimerProfile(name);
  }

  public async getAllTimerProfiles(): Promise<any[]> {
    return this.apiDB.getAllTimerProfiles();
  }

  // App settings methods - delegate to API database
  public async getSetting(key: string): Promise<string | null> {
    return this.apiDB.getSetting(key);
  }

  public async setSetting(key: string, value: string): Promise<void> {
    return this.apiDB.setSetting(key, value);
  }

  // Export/Import methods - delegate to API database
  public async exportData(): Promise<string> {
    return this.apiDB.exportData();
  }

  public async clearAllData(): Promise<void> {
    return this.apiDB.clearAllData();
  }

  // Legacy compatibility methods for existing code
  public async forceSync(): Promise<void> {
    return this.apiDB.forceSync();
  }

  public isCloudConnected(): boolean {
    return this.apiDB.isApiConnected();
  }

  public isRealtimeSyncActive(): boolean {
    return this.apiDB.isRealtimeSyncActive();
  }

  public getSyncManager(): null {
    return this.apiDB.getSyncManager();
  }

  public getStartupSyncService(): null {
    return this.apiDB.getStartupSyncService();
  }

  public async getStartupSyncStatus(): Promise<null> {
    return this.apiDB.getStartupSyncStatus();
  }

  public async forceStartupSync(): Promise<void> {
    return this.apiDB.forceStartupSync();
  }

  public async getCloudExportData(): Promise<string | null> {
    return this.apiDB.getCloudExportData();
  }

  // Direct access to API database manager
  public getAPIManager(): APIDatabaseManager {
    return this.apiDB;
  }
}

export default DatabaseManager;