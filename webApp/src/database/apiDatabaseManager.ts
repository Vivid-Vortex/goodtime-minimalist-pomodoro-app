// Database manager that uses Express API instead of IndexedDB
import apiService, { APISession, APILabel, APITimerProfile } from '../services/apiService';

class APIDatabaseManager {
  private isConnected: boolean = false;
  private static instance: APIDatabaseManager;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): APIDatabaseManager {
    if (!APIDatabaseManager.instance) {
      APIDatabaseManager.instance = new APIDatabaseManager();
    }
    return APIDatabaseManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔗 APIDatabaseManager: Connecting to API backend...');
      console.log('🔗 APIDatabaseManager: API service base URL:', apiService['baseURL']);
      const isAvailable = await apiService.isAvailable();
      
      if (isAvailable) {
        this.isConnected = true;
        console.log('✅ APIDatabaseManager: Connected to API backend successfully');
      } else {
        console.warn('⚠️ APIDatabaseManager: API backend not available');
      }
    } catch (error) {
      console.error('❌ APIDatabaseManager: Failed to connect to API backend:', error);
    }
  }

  // Connection status
  public isApiConnected(): boolean {
    return this.isConnected;
  }

  // Session methods
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
    const apiSession: Partial<APISession> = {
      id: session.id,
      label: session.label || 'Default',
      is_break: session.timerType === 'BREAK' || session.timerType === 'LONG_BREAK',
      duration: session.duration,
      end: new Date(session.endTime).toISOString(),
      archived: session.archived || false,
      notes: session.notes || '',
      interruptions: session.interruptions || 0
    };

    await apiService.createSession(apiSession);
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
    const apiUpdates: Partial<APISession> = {};

    if (updates.label !== undefined) apiUpdates.label = updates.label;
    if (updates.timerType !== undefined) {
      apiUpdates.is_break = updates.timerType === 'BREAK' || updates.timerType === 'LONG_BREAK';
    }
    if (updates.duration !== undefined) apiUpdates.duration = updates.duration;
    if (updates.endTime !== undefined) apiUpdates.end = new Date(updates.endTime).toISOString();
    if (updates.archived !== undefined) apiUpdates.archived = updates.archived;
    if (updates.notes !== undefined) apiUpdates.notes = updates.notes;
    if (updates.interruptions !== undefined) apiUpdates.interruptions = updates.interruptions;

    await apiService.updateSession(id, apiUpdates);
  }

  public async deleteSession(id: string): Promise<void> {
    await apiService.deleteSession(id);
  }

  public async getAllSessions(): Promise<any[]> {
    const sessions = await apiService.getAllSessions();
    
    // Transform API format to internal format
    return sessions.map(session => ({
      id: session.id,
      labelId: session.label,
      timerType: session.is_break ? 'BREAK' : 'FOCUS',
      duration: session.duration,
      endTime: new Date(session.end).getTime(),
      archived: session.archived,
      notes: session.notes,
      interruptions: session.interruptions,
      createdAt: Date.now() // API doesn't return this, use current time
    }));
  }

  public async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    return await apiService.getSessionStats();
  }

  // Label methods
  public async insertLabel(label: {
    id: string;
    title: string;
    color: number;
    archived?: boolean;
    orderIndex: number;
  }): Promise<void> {
    const apiLabel: Partial<APILabel> = {
      id: label.id,
      title: label.title,
      color: label.color,
      archived: label.archived || false,
      orderIndex: label.orderIndex
    };

    await apiService.createLabel(apiLabel);
  }

  public async updateLabel(id: string, updates: {
    title?: string;
    color?: number;
    archived?: boolean;
    orderIndex?: number;
  }): Promise<void> {
    await apiService.updateLabel(id, updates);
  }

  public async deleteLabel(id: string): Promise<void> {
    await apiService.deleteLabel(id);
  }

  public async getAllLabels(): Promise<any[]> {
    const labels = await apiService.getAllLabels();
    
    // Transform to internal format
    return labels.map(label => ({
      id: label.id,
      title: label.title,
      color: label.color,
      archived: label.archived,
      orderIndex: label.orderIndex,
      createdAt: Date.now() // API doesn't return this
    }));
  }

  // Timer profile methods
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
    const apiProfile: Partial<APITimerProfile> = {
      name: profile.name,
      isCountdown: profile.isCountdown !== false,
      workDuration: profile.workDuration,
      isBreakEnabled: profile.isBreakEnabled !== false,
      breakDuration: profile.breakDuration,
      isLongBreakEnabled: profile.isLongBreakEnabled || false,
      longBreakDuration: profile.longBreakDuration,
      sessionsBeforeLongBreak: profile.sessionsBeforeLongBreak,
      workBreakRatio: profile.workBreakRatio
    };

    await apiService.createTimerProfile(apiProfile);
  }

  public async updateTimerProfile(name: string, updates: any): Promise<void> {
    await apiService.updateTimerProfile(name, updates);
  }

  public async deleteTimerProfile(name: string): Promise<void> {
    await apiService.deleteTimerProfile(name);
  }

  public async getAllTimerProfiles(): Promise<any[]> {
    const profiles = await apiService.getAllTimerProfiles();
    
    // Transform to internal format (they're mostly the same)
    return profiles.map(profile => ({
      ...profile,
      createdAt: Date.now() // API doesn't return this
    }));
  }

  // App settings methods
  public async getSetting(key: string): Promise<string | null> {
    try {
      const result = await apiService.getSetting(key);
      return result.value;
    } catch (error) {
      // Return null if setting doesn't exist
      return null;
    }
  }

  public async setSetting(key: string, value: string): Promise<void> {
    await apiService.setSetting(key, value);
  }

  // Export/Import methods
  public async exportData(): Promise<string> {
    const sessions = await apiService.exportData('json');
    return JSON.stringify(sessions);
  }

  public async clearAllData(): Promise<void> {
    console.warn('clearAllData not implemented for API backend - would require admin endpoint');
    throw new Error('Clear all data not supported via API');
  }

  // Force sync (for compatibility)
  public async forceSync(): Promise<void> {
    console.log('Force sync called - API backend is always synchronized');
    // API backend is always synchronized, so this is a no-op
  }

  // Legacy compatibility methods
  public isCloudConnected(): boolean {
    return this.isConnected;
  }

  public isRealtimeSyncActive(): boolean {
    return this.isConnected; // API is always "real-time" synced
  }

  public getSyncManager(): null {
    return null; // No separate sync manager needed
  }

  public getStartupSyncService(): null {
    return null; // No separate startup sync service needed
  }

  public async getStartupSyncStatus(): Promise<null> {
    return null; // Not applicable for API backend
  }

  public async forceStartupSync(): Promise<void> {
    // No-op for API backend
  }

  public async getCloudExportData(): Promise<string | null> {
    try {
      return await this.exportData();
    } catch (error) {
      console.error('Failed to get export data:', error);
      return null;
    }
  }
}

export default APIDatabaseManager;