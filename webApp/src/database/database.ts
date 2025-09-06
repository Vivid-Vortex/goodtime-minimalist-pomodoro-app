import IndexedDBManager from './indexedDBManager';
import CloudDBManager from './cloudDBManager';
import RealtimeSyncManager from '../sync/realtimeSyncManager';

class DatabaseManager {
  private indexedDB: IndexedDBManager;
  private cloudDB: CloudDBManager | null = null;
  private syncManager: RealtimeSyncManager | null = null;
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
      
      // Try to initialize Cloud DB connection
      await this.initializeCloudDB();
      
      // Ensure default data exists
      await this.ensureDefaultData();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async initializeCloudDB(): Promise<void> {
    try {
      this.cloudDB = new CloudDBManager();
      await this.cloudDB.connect();
      console.log('Cloud database connection established');
      
      // Initialize real-time sync manager
      await this.initializeRealtimeSync();
      
      // Sync local data to cloud if connection successful
      await this.syncToCloud();
    } catch (error) {
      console.warn('Cloud database connection failed, using local storage only:', error);
      this.cloudDB = null;
      this.syncManager = null;
    }
  }

  private async initializeRealtimeSync(): Promise<void> {
    try {
      this.syncManager = new RealtimeSyncManager();
      await this.syncManager.connect();
      console.log('Real-time sync manager initialized');
    } catch (error) {
      console.warn('Real-time sync initialization failed:', error);
      this.syncManager = null;
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
          name: '72/5',
          isCountdown: true,
          workDuration: 72,
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

  // Sync methods
  private async syncToCloud(): Promise<void> {
    if (!this.cloudDB) return;

    try {
      // First, perform bidirectional sync
      await this.performBidirectionalSync();
      
      console.log('Bidirectional sync completed successfully');
    } catch (error) {
      console.warn('Failed to perform bidirectional sync:', error);
    }
  }

  public async performBidirectionalSync(): Promise<void> {
    if (!this.cloudDB) return;

    try {
      console.log('Starting bidirectional sync...');
      
      // Step 1: Get all local data
      const localSessions = await this.indexedDB.getAllSessions();
      const localLabels = await this.indexedDB.getAllLabels();
      const localProfiles = await this.indexedDB.getAllTimerProfiles();
      
      // Step 2: Get all remote data
      const remoteSessions = await this.cloudDB.getAllSessions();
      const remoteLabels = await this.cloudDB.getAllLabels();
      const remoteProfiles = await this.cloudDB.getAllTimerProfiles();
      
      console.log('Local data:', { sessions: localSessions.length, labels: localLabels.length, profiles: localProfiles.length });
      console.log('Remote data:', { sessions: remoteSessions.length, labels: remoteLabels.length, profiles: remoteProfiles.length });
      
      // Step 3: Merge and upload local data to cloud (upserts)
      if (localSessions.length > 0 || localLabels.length > 0 || localProfiles.length > 0) {
        await this.cloudDB.syncFromLocal({
          sessions: localSessions,
          labels: localLabels,
          timerProfiles: localProfiles
        });
        console.log('Local data uploaded to cloud');
      }
      
      // Step 4: Merge remote data into local database
      await this.mergeRemoteDataLocally(remoteSessions, remoteLabels, remoteProfiles);
      
    } catch (error) {
      console.error('Bidirectional sync failed:', error);
      throw error;
    }
  }

  private async mergeRemoteDataLocally(
    remoteSessions: any[], 
    remoteLabels: any[], 
    remoteProfiles: any[]
  ): Promise<void> {
    let merged = { sessions: 0, labels: 0, profiles: 0 };

    // Merge remote sessions
    for (const remoteSession of remoteSessions) {
      try {
        // Check if session exists locally
        const localSessions = await this.indexedDB.getAllSessions();
        const existing = localSessions.find(s => s.id === remoteSession.id);
        
        if (!existing) {
          // Convert cloud format to local format
          const localSession = {
            id: remoteSession.id,
            labelId: remoteSession.label,
            timerType: remoteSession.is_break ? 'BREAK' : 'WORK',
            duration: remoteSession.duration,
            endTime: new Date(remoteSession.end).getTime(),
            archived: remoteSession.archived,
            notes: remoteSession.notes || '',
            interruptions: remoteSession.interruptions || 0
          };
          
          await this.indexedDB.insertSession(localSession);
          merged.sessions++;
        }
      } catch (error) {
        console.warn('Failed to merge remote session:', remoteSession.id, error);
      }
    }

    // Merge remote labels
    for (const remoteLabel of remoteLabels) {
      try {
        const localLabels = await this.indexedDB.getAllLabels();
        const existing = localLabels.find(l => l.id === remoteLabel.id);
        
        if (!existing) {
          await this.indexedDB.insertLabel({
            id: remoteLabel.id,
            title: remoteLabel.title,
            color: remoteLabel.color,
            archived: remoteLabel.archived,
            orderIndex: remoteLabel.orderIndex
          });
          merged.labels++;
        }
      } catch (error) {
        console.warn('Failed to merge remote label:', remoteLabel.id, error);
      }
    }

    // Merge remote timer profiles
    for (const remoteProfile of remoteProfiles) {
      try {
        const localProfiles = await this.indexedDB.getAllTimerProfiles();
        const existing = localProfiles.find(p => p.name === remoteProfile.name);
        
        if (!existing) {
          await this.indexedDB.insertTimerProfile(remoteProfile);
          merged.profiles++;
        }
      } catch (error) {
        console.warn('Failed to merge remote profile:', remoteProfile.name, error);
      }
    }

    if (merged.sessions > 0 || merged.labels > 0 || merged.profiles > 0) {
      console.log('Merged remote data locally:', merged);
    }
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
    const sessionData = {
      ...session,
      labelId: session.label || 'default',
      archived: session.archived || false
    };

    // Save to local storage
    await this.indexedDB.insertSession(sessionData);

    // Try to save to cloud storage
    if (this.cloudDB) {
      try {
        await this.cloudDB.insertSession(sessionData);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('SESSION_CREATED', sessionData);
        }
      } catch (error) {
        console.warn('Failed to sync session to cloud:', error);
        
        // Queue for background sync if available
        this.queueBackgroundSync('INSERT', 'session', sessionData);
      }
    } else {
      // Queue for background sync when offline
      this.queueBackgroundSync('INSERT', 'session', sessionData);
    }
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
    const indexedDBUpdates: any = { ...updates };
    if (updates.label) {
      indexedDBUpdates.labelId = updates.label;
      delete indexedDBUpdates.label;
    }
    
    // Update local storage
    await this.indexedDB.updateSession(id, indexedDBUpdates);

    // Try to update cloud storage
    const sessionData = { id, ...indexedDBUpdates };
    if (this.cloudDB) {
      try {
        await this.cloudDB.updateSession(id, sessionData);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('SESSION_UPDATED', sessionData);
        }
      } catch (error) {
        console.warn('Failed to sync session update to cloud:', error);
        this.queueBackgroundSync('UPDATE', 'session', sessionData);
      }
    } else {
      this.queueBackgroundSync('UPDATE', 'session', sessionData);
    }
  }

  public async deleteSession(id: string): Promise<void> {
    // Delete from local storage
    await this.indexedDB.deleteSession(id);

    // Try to delete from cloud storage
    if (this.cloudDB) {
      try {
        await this.cloudDB.deleteSession(id);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('SESSION_DELETED', { id });
        }
      } catch (error) {
        console.warn('Failed to sync session deletion to cloud:', error);
        this.queueBackgroundSync('DELETE', 'session', { id });
      }
    } else {
      this.queueBackgroundSync('DELETE', 'session', { id });
    }
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
  public async insertLabel(label: {
    id: string;
    title: string;
    color: number;
    archived?: boolean;
    orderIndex: number;
  }): Promise<void> {
    const labelData = {
      ...label,
      archived: label.archived || false
    };

    // Save to local storage
    await this.indexedDB.insertLabel(labelData);

    // Try to save to cloud storage
    if (this.cloudDB) {
      try {
        await this.cloudDB.insertLabel(labelData);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('LABEL_CREATED', labelData);
        }
      } catch (error) {
        console.warn('Failed to sync label to cloud:', error);
        
        // Queue for background sync if available
        this.queueBackgroundSync('INSERT', 'label', labelData);
      }
    } else {
      // Queue for background sync when offline
      this.queueBackgroundSync('INSERT', 'label', labelData);
    }
  }

  public async updateLabel(id: string, updates: {
    title?: string;
    color?: number;
    archived?: boolean;
    orderIndex?: number;
  }): Promise<void> {
    // Update local storage
    await this.indexedDB.updateLabel(id, updates);

    // Try to update cloud storage
    const labelData = { id, ...updates };
    if (this.cloudDB) {
      try {
        await this.cloudDB.updateLabel(id, updates);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('LABEL_UPDATED', labelData);
        }
      } catch (error) {
        console.warn('Failed to sync label update to cloud:', error);
        this.queueBackgroundSync('UPDATE', 'label', labelData);
      }
    } else {
      this.queueBackgroundSync('UPDATE', 'label', labelData);
    }
  }

  public async deleteLabel(id: string): Promise<void> {
    // Delete from local storage
    await this.indexedDB.deleteLabel(id);

    // Try to delete from cloud storage
    if (this.cloudDB) {
      try {
        await this.cloudDB.deleteLabel(id);
        
        // Broadcast real-time change
        if (this.syncManager) {
          await this.syncManager.broadcastChange('LABEL_DELETED', { id });
        }
      } catch (error) {
        console.warn('Failed to sync label deletion to cloud:', error);
        this.queueBackgroundSync('DELETE', 'label', { id });
      }
    } else {
      this.queueBackgroundSync('DELETE', 'label', { id });
    }
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
  public async exportData(): Promise<string> {
    // Try to export from cloud first (latest data), fallback to local
    if (this.cloudDB) {
      try {
        return await this.cloudDB.exportData();
      } catch (error) {
        console.warn('Failed to export from cloud, using local data:', error);
      }
    }
    return this.indexedDB.exportData();
  }

  public async clearAllData(): Promise<void> {
    await this.indexedDB.clearAllData();
    
    if (this.cloudDB) {
      try {
        // Cloud database would handle clearing via API calls
        console.log('Clear cloud data would be implemented via backend API');
      } catch (error) {
        console.warn('Failed to clear cloud data:', error);
      }
    }
  }

  // Background sync queue
  private async queueBackgroundSync(operation: 'INSERT' | 'UPDATE' | 'DELETE', type: 'session' | 'label' | 'profile' | 'setting', data: any): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'QUEUE_SYNC_OPERATION',
          data: {
            operation,
            type,
            data
          }
        });
      } catch (error) {
        console.warn('Failed to queue background sync operation:', error);
      }
    }
  }

  // Cloud sync control methods
  public async forceSync(): Promise<void> {
    await this.syncToCloud();
    
    if (this.syncManager) {
      await this.syncManager.forceFullSync();
    }
  }

  public isCloudConnected(): boolean {
    return this.cloudDB !== null && this.cloudDB.isConnectionActive();
  }

  public isRealtimeSyncActive(): boolean {
    return this.syncManager !== null;
  }

  public getSyncManager(): RealtimeSyncManager | null {
    return this.syncManager;
  }

  public async getCloudExportData(): Promise<string | null> {
    if (!this.cloudDB) return null;
    try {
      return await this.cloudDB.exportData();
    } catch (error) {
      console.error('Failed to get cloud export data:', error);
      return null;
    }
  }
}

export default DatabaseManager;