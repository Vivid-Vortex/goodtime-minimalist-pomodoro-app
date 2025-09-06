// Startup sync service to ensure IndexedDB and MongoDB are synchronized on app startup
// This handles scenarios where users switch browsers, ports, or have been offline

// Import only what we need to avoid circular dependency
import type IndexedDBManager from '../database/indexedDBManager';
import type CloudDBManager from '../database/cloudDBManager';
import type RealtimeSyncManager from '../sync/realtimeSyncManager';

export interface SyncResult {
  success: boolean;
  synced: {
    sessions: number;
    labels: number;
    profiles: number;
  };
  errors: string[];
}

export interface SyncOptions {
  forceFullSync?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

class StartupSyncService {
  private indexedDB: IndexedDBManager | null = null;
  private cloudDB: CloudDBManager | null = null;
  private syncManager: RealtimeSyncManager | null = null;
  private isInitialized: boolean = false;
  private syncPromise: Promise<SyncResult> | null = null;
  private deviceId: string;
  private lastSyncTimestamp: number = 0;

  constructor() {
    this.deviceId = this.getDeviceId();
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Inject dependencies to avoid circular imports
  public setDependencies(
    indexedDB: IndexedDBManager,
    cloudDB: CloudDBManager | null,
    syncManager: RealtimeSyncManager | null
  ): void {
    this.indexedDB = indexedDB;
    this.cloudDB = cloudDB;
    this.syncManager = syncManager;
    // Load last sync timestamp asynchronously
    this.loadLastSyncTimestamp().catch(error => {
      console.warn('Failed to load last sync timestamp:', error);
    });
  }

  private async loadLastSyncTimestamp(): Promise<void> {
    if (!this.indexedDB) return;
    const timestamp = await this.indexedDB.getSetting('lastSyncTimestamp');
    this.lastSyncTimestamp = timestamp ? parseInt(timestamp) : Date.now();
  }

  private async saveLastSyncTimestamp(): Promise<void> {
    if (!this.indexedDB) return;
    this.lastSyncTimestamp = Date.now();
    await this.indexedDB.setSetting('lastSyncTimestamp', this.lastSyncTimestamp.toString());
  }

  /**
   * Performs initial sync on app startup
   * This ensures data consistency across different browsers/ports
   */
  public async performStartupSync(options: SyncOptions = {}): Promise<SyncResult> {
    // Prevent multiple concurrent sync operations
    if (this.syncPromise) {
      return this.syncPromise;
    }

    const {
      forceFullSync = false,
      timeout = 30000, // 30 seconds
      retryAttempts = 3
    } = options;

    this.syncPromise = this._performSyncWithRetry(forceFullSync, timeout, retryAttempts);
    
    try {
      const result = await this.syncPromise;
      this.isInitialized = true;
      return result;
    } finally {
      this.syncPromise = null;
    }
  }

  private async _performSyncWithRetry(
    forceFullSync: boolean, 
    timeout: number, 
    retryAttempts: number
  ): Promise<SyncResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`Startup sync attempt ${attempt}/${retryAttempts}`);
        
        const result = await Promise.race([
          this._performSync(forceFullSync),
          this._createTimeoutPromise(timeout)
        ]);

        console.log('Startup sync completed successfully:', result);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Startup sync attempt ${attempt} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed - return partial result
    console.error('All startup sync attempts failed:', lastError?.message);
    return {
      success: false,
      synced: { sessions: 0, labels: 0, profiles: 0 },
      errors: [lastError?.message || 'Unknown error occurred during startup sync']
    };
  }

  private async _performSync(forceFullSync: boolean): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: { sessions: 0, labels: 0, profiles: 0 },
      errors: []
    };

    try {
      // Check if cloud connection is available
      if (!this.cloudDB) {
        console.log('Cloud connection unavailable, running in local-only mode');
        return {
          success: true,
          synced: { sessions: 0, labels: 0, profiles: 0 },
          errors: ['Cloud connection unavailable']
        };
      }

      // Determine sync strategy
      const lastSyncTimestamp = await this.indexedDB?.getSetting('lastStartupSync');
      const shouldPerformFullSync = forceFullSync || !lastSyncTimestamp || 
        (Date.now() - parseInt(lastSyncTimestamp)) > 24 * 60 * 60 * 1000; // 24 hours

      if (shouldPerformFullSync) {
        console.log('Performing full bidirectional sync...');
        result.synced = await this._performFullSync();
      } else {
        console.log('Performing incremental sync...');
        result.synced = await this._performIncrementalSync(parseInt(lastSyncTimestamp));
      }

      // Update last sync timestamp
      await this.indexedDB?.setSetting('lastStartupSync', Date.now().toString());
      
      console.log('Startup sync completed:', result);
      
    } catch (error) {
      console.error('Startup sync error:', error);
      result.success = false;
      result.errors.push((error as Error).message);
    }

    return result;
  }

  private async _attemptCloudConnection(): Promise<void> {
    // This method is no longer needed since dependencies are injected
    console.log('Cloud connection managed by parent database manager');
  }

  private async _performFullSync(): Promise<{ sessions: number; labels: number; profiles: number }> {
    const synced = { sessions: 0, labels: 0, profiles: 0 };

    try {
      if (!this.indexedDB || !this.cloudDB) {
        throw new Error('Required dependencies not available for full sync');
      }

      // Get local data
      const [localSessions, localLabels, localProfiles] = await Promise.all([
        this.indexedDB.getAllSessions(),
        this.indexedDB.getAllLabels(),
        this.indexedDB.getAllTimerProfiles()
      ]);

      console.log('Local data counts:', {
        sessions: localSessions.length,
        labels: localLabels.length,
        profiles: localProfiles.length
      });

      // Get cloud data and merge it
      const [cloudSessions, cloudLabels, cloudProfiles] = await Promise.all([
        this.cloudDB.getAllSessions(),
        this.cloudDB.getAllLabels(),
        this.cloudDB.getAllTimerProfiles()
      ]);

      console.log('Cloud data counts:', {
        sessions: cloudSessions.length,
        labels: cloudLabels.length,
        profiles: cloudProfiles.length
      });

      // Sync cloud data to local (prioritize cloud data)
      synced.sessions = await this._syncSessionsToLocal(cloudSessions, localSessions);
      synced.labels = await this._syncLabelsToLocal(cloudLabels, localLabels);
      synced.profiles = await this._syncProfilesToLocal(cloudProfiles, localProfiles);

      console.log('Full sync completed, synced counts:', synced);

    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }

    return synced;
  }

  private async _performIncrementalSync(lastSyncTimestamp: number): Promise<{ sessions: number; labels: number; profiles: number }> {
    const synced = { sessions: 0, labels: 0, profiles: 0 };

    try {
      // For incremental sync, we can use the real-time sync manager if available
      if (this.syncManager) {
        // Connect and let the real-time sync manager handle incremental updates
        await this.syncManager.connect();
        console.log('Incremental sync handled by real-time sync manager');
      } else {
        // Fallback to full sync if real-time sync is not available
        return await this._performFullSync();
      }

    } catch (error) {
      console.error('Incremental sync failed:', error);
      // Fallback to full sync
      return await this._performFullSync();
    }

    return synced;
  }

  private _createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Startup sync timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Check if the service has been initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Force a new sync operation (bypasses initialization check)
   */
  public async forceSyncNow(options: SyncOptions = {}): Promise<SyncResult> {
    this.isInitialized = false;
    return this.performStartupSync({ ...options, forceFullSync: true });
  }

  // Helper methods for syncing data types
  private async _syncSessionsToLocal(cloudSessions: any[], localSessions: any[]): Promise<number> {
    if (!this.indexedDB) return 0;
    
    let syncedCount = 0;
    for (const cloudSession of cloudSessions) {
      const existingLocal = localSessions.find(s => s.id === cloudSession.id);
      
      if (!existingLocal) {
        // Convert cloud format to local format and insert
        const localSession = {
          id: cloudSession.id,
          labelId: cloudSession.label,
          timerType: cloudSession.is_break ? 'BREAK' : 'FOCUS',
          duration: cloudSession.duration * 60, // Convert minutes to seconds
          endTime: new Date(cloudSession.end).getTime(),
          archived: cloudSession.archived,
          notes: cloudSession.notes || '',
        };
        
        await this.indexedDB.insertSession(localSession);
        syncedCount++;
      }
    }
    return syncedCount;
  }

  private async _syncLabelsToLocal(cloudLabels: any[], localLabels: any[]): Promise<number> {
    if (!this.indexedDB) return 0;
    
    let syncedCount = 0;
    for (const cloudLabel of cloudLabels) {
      const existingLocal = localLabels.find(l => l.id === cloudLabel.id);
      
      if (!existingLocal) {
        await this.indexedDB.insertLabel(cloudLabel);
        syncedCount++;
      } else if (existingLocal.title !== cloudLabel.title || existingLocal.color !== cloudLabel.color) {
        await this.indexedDB.updateLabel(cloudLabel.id, cloudLabel);
        syncedCount++;
      }
    }
    return syncedCount;
  }

  private async _syncProfilesToLocal(cloudProfiles: any[], localProfiles: any[]): Promise<number> {
    if (!this.indexedDB) return 0;
    
    let syncedCount = 0;
    for (const cloudProfile of cloudProfiles) {
      const existingLocal = localProfiles.find(p => p.name === cloudProfile.name);
      
      if (!existingLocal) {
        await this.indexedDB.insertTimerProfile(cloudProfile);
        syncedCount++;
      } else {
        await this.indexedDB.updateTimerProfile(cloudProfile.name, cloudProfile);
        syncedCount++;
      }
    }
    return syncedCount;
  }

  /**
   * Get sync status information
   */
  public async getSyncStatus(): Promise<{
    lastStartupSync: number | null;
    cloudConnected: boolean;
    realtimeSyncActive: boolean;
  }> {
    const lastSyncStr = await this.indexedDB?.getSetting('lastStartupSync');
    return {
      lastStartupSync: lastSyncStr ? parseInt(lastSyncStr) : null,
      cloudConnected: !!this.cloudDB,
      realtimeSyncActive: !!this.syncManager
    };
  }

  /**
   * Detect if user might be on a different browser/port and needs full sync
   */
  public async needsFullSync(): Promise<boolean> {
    if (!this.indexedDB) return true;

    const lastSyncStr = await this.indexedDB.getSetting('lastStartupSync');
    
    if (!lastSyncStr) {
      return true; // Never synced before
    }

    const lastSync = parseInt(lastSyncStr);
    const daysSinceLastSync = (Date.now() - lastSync) / (24 * 60 * 60 * 1000);
    
    // Force full sync if:
    // 1. More than 7 days since last sync
    // 2. Cloud is available but we have very little local data (suggests new browser/device)
    const localSessions = await this.indexedDB.getAllSessions();
    const hasMinimalLocalData = localSessions.length < 5;
    
    return daysSinceLastSync > 7 || (!!this.cloudDB && hasMinimalLocalData);
  }
}

export default StartupSyncService;