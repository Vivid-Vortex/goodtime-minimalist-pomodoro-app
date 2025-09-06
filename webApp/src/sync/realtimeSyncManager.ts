// Real-time sync manager with WebSocket support
import DatabaseManager from '../database/database';

export enum SyncStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR'
}

export interface SyncEvent {
  type: 'SESSION_CREATED' | 'SESSION_UPDATED' | 'SESSION_DELETED' | 
        'LABEL_CREATED' | 'LABEL_UPDATED' | 'LABEL_DELETED' |
        'PROFILE_CREATED' | 'PROFILE_UPDATED' | 'PROFILE_DELETED' |
        'SETTINGS_UPDATED' | 'FULL_SYNC' | 'CONFLICT_DETECTED';
  data: any;
  timestamp: number;
  deviceId: string;
}

export interface ConflictData {
  type: 'session' | 'label' | 'profile' | 'setting';
  localData: any;
  remoteData: any;
  field: string;
  id: string;
}

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private status: SyncStatus = SyncStatus.DISCONNECTED;
  private deviceId: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private dbManager: DatabaseManager;
  private pendingSyncQueue: SyncEvent[] = [];
  private lastSyncTimestamp: number = 0;

  // Event listeners
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private syncListeners: ((event: SyncEvent) => void)[] = [];
  private conflictListeners: ((conflict: ConflictData) => void)[] = [];

  constructor() {
    this.deviceId = this.getDeviceId();
    this.dbManager = DatabaseManager.getInstance();
    this.loadLastSyncTimestamp();
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private async loadLastSyncTimestamp(): Promise<void> {
    const timestamp = await this.dbManager.getSetting('lastSyncTimestamp');
    this.lastSyncTimestamp = timestamp ? parseInt(timestamp) : Date.now();
  }

  private async saveLastSyncTimestamp(): Promise<void> {
    this.lastSyncTimestamp = Date.now();
    await this.dbManager.setSetting('lastSyncTimestamp', this.lastSyncTimestamp.toString());
  }

  // Event listener management
  public onStatusChange(callback: (status: SyncStatus) => void): void {
    this.statusListeners.push(callback);
  }

  public onSyncEvent(callback: (event: SyncEvent) => void): void {
    this.syncListeners.push(callback);
  }

  public onConflict(callback: (conflict: ConflictData) => void): void {
    this.conflictListeners.push(callback);
  }

  private emitStatusChange(status: SyncStatus): void {
    this.status = status;
    this.statusListeners.forEach(callback => callback(status));
  }

  private emitSyncEvent(event: SyncEvent): void {
    this.syncListeners.forEach(callback => callback(event));
  }

  private emitConflict(conflict: ConflictData): void {
    this.conflictListeners.forEach(callback => callback(conflict));
  }

  // WebSocket connection management
  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3001/ws';
    
    try {
      this.emitStatusChange(SyncStatus.CONNECTING);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleWebSocketOpen.bind(this);
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);
      this.ws.onclose = this.handleWebSocketClose.bind(this);
      this.ws.onerror = this.handleWebSocketError.bind(this);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.emitStatusChange(SyncStatus.ERROR);
      this.scheduleReconnect();
    }
  }

  private async handleWebSocketOpen(): Promise<void> {
    console.log('WebSocket connected');
    this.emitStatusChange(SyncStatus.CONNECTED);
    this.reconnectAttempts = 0;
    
    // Send device identification
    this.sendMessage({
      type: 'DEVICE_CONNECT',
      deviceId: this.deviceId,
      timestamp: Date.now()
    });

    // Start periodic sync
    this.startPeriodicSync();
    
    // Process pending sync queue
    await this.processPendingSyncQueue();
    
    // Initial sync check
    await this.performIncrementalSync();
  }

  private async handleWebSocketMessage(event: MessageEvent): Promise<void> {
    try {
      const syncEvent: SyncEvent = JSON.parse(event.data);
      
      // Ignore events from this device
      if (syncEvent.deviceId === this.deviceId) {
        return;
      }

      console.log('Received sync event:', syncEvent);
      this.emitSyncEvent(syncEvent);
      
      // Apply remote changes locally
      await this.applyRemoteChange(syncEvent);
      
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  private handleWebSocketClose(): void {
    console.log('WebSocket disconnected');
    this.emitStatusChange(SyncStatus.DISCONNECTED);
    this.stopPeriodicSync();
    this.scheduleReconnect();
  }

  private handleWebSocketError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emitStatusChange(SyncStatus.ERROR);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  // Message sending
  private sendMessage(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      this.pendingSyncQueue.push(data);
    }
  }

  // Periodic sync
  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    this.syncInterval = setInterval(async () => {
      await this.performIncrementalSync();
    }, 30000); // Sync every 30 seconds
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync operations
  public async broadcastChange(type: SyncEvent['type'], data: any): Promise<void> {
    const syncEvent: SyncEvent = {
      type,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    this.sendMessage(syncEvent);
    
    // Also emit locally for UI updates
    this.emitSyncEvent(syncEvent);
  }

  private async performIncrementalSync(): Promise<void> {
    if (!this.dbManager.isCloudConnected()) {
      return;
    }

    this.emitStatusChange(SyncStatus.SYNCING);
    
    try {
      // Get changes since last sync
      const response = await fetch(`${(import.meta as any).env?.VITE_API_BASE_URL}/sync/changes?since=${this.lastSyncTimestamp}&deviceId=${this.deviceId}`);
      
      if (response.ok) {
        const changes = await response.json();
        
        for (const change of changes) {
          await this.applyRemoteChange(change);
        }
        
        await this.saveLastSyncTimestamp();
      }
      
      this.emitStatusChange(SyncStatus.CONNECTED);
    } catch (error) {
      console.error('Incremental sync failed:', error);
      this.emitStatusChange(SyncStatus.ERROR);
    }
  }

  private async applyRemoteChange(syncEvent: SyncEvent): Promise<void> {
    try {
      switch (syncEvent.type) {
        case 'SESSION_CREATED':
          await this.handleRemoteSessionCreated(syncEvent.data);
          break;
        case 'SESSION_UPDATED':
          await this.handleRemoteSessionUpdated(syncEvent.data);
          break;
        case 'SESSION_DELETED':
          await this.handleRemoteSessionDeleted(syncEvent.data);
          break;
        case 'LABEL_CREATED':
          await this.handleRemoteLabelCreated(syncEvent.data);
          break;
        case 'LABEL_UPDATED':
          await this.handleRemoteLabelUpdated(syncEvent.data);
          break;
        case 'LABEL_DELETED':
          await this.handleRemoteLabelDeleted(syncEvent.data);
          break;
        case 'PROFILE_CREATED':
        case 'PROFILE_UPDATED':
        case 'PROFILE_DELETED':
          // Handle timer profile changes
          break;
        case 'SETTINGS_UPDATED':
          await this.handleRemoteSettingsUpdated(syncEvent.data);
          break;
      }
    } catch (error) {
      console.error('Error applying remote change:', error);
    }
  }

  // Conflict resolution
  private async detectConflict(localData: any, remoteData: any, type: string, id: string): Promise<ConflictData | null> {
    // Simple last-write-wins for now, but can be made more sophisticated
    if (localData.lastModified && remoteData.lastModified) {
      if (localData.lastModified > remoteData.lastModified) {
        return null; // Local is newer, keep local
      }
    }

    // Check for actual data differences
    const conflicts: ConflictData[] = [];
    
    Object.keys(remoteData).forEach(key => {
      if (key === 'lastModified' || key === 'deviceId') return;
      
      if (localData[key] !== remoteData[key]) {
        conflicts.push({
          type: type as any,
          localData: localData[key],
          remoteData: remoteData[key],
          field: key,
          id: id
        });
      }
    });

    return conflicts.length > 0 ? conflicts[0] : null;
  }

  // Remote change handlers
  private async handleRemoteSessionCreated(sessionData: any): Promise<void> {
    try {
      // Check if session already exists locally
      const existingSessions = await this.dbManager.getAllSessions();
      const existing = existingSessions.find(s => s.id === sessionData.id);
      
      if (!existing) {
        await this.dbManager.insertSession({
          ...sessionData,
          label: sessionData.labelId
        });
      } else {
        // Detect conflicts
        const conflict = await this.detectConflict(existing, sessionData, 'session', sessionData.id);
        if (conflict) {
          this.emitConflict(conflict);
        }
      }
    } catch (error) {
      console.error('Error handling remote session created:', error);
    }
  }

  private async handleRemoteSessionUpdated(sessionData: any): Promise<void> {
    try {
      const existingSessions = await this.dbManager.getAllSessions();
      const existing = existingSessions.find(s => s.id === sessionData.id);
      
      if (existing) {
        const conflict = await this.detectConflict(existing, sessionData, 'session', sessionData.id);
        if (conflict) {
          this.emitConflict(conflict);
          return;
        }
      }
      
      await this.dbManager.updateSession(sessionData.id, {
        ...sessionData,
        label: sessionData.labelId
      });
    } catch (error) {
      console.error('Error handling remote session updated:', error);
    }
  }

  private async handleRemoteSessionDeleted(data: { id: string }): Promise<void> {
    try {
      await this.dbManager.deleteSession(data.id);
    } catch (error) {
      console.error('Error handling remote session deleted:', error);
    }
  }

  private async handleRemoteLabelCreated(labelData: any): Promise<void> {
    try {
      const existingLabels = await this.dbManager.getAllLabels();
      const existing = existingLabels.find(l => l.id === labelData.id);
      
      if (!existing) {
        await this.dbManager.insertLabel(labelData);
      }
    } catch (error) {
      console.error('Error handling remote label created:', error);
    }
  }

  private async handleRemoteLabelUpdated(labelData: any): Promise<void> {
    try {
      await this.dbManager.updateLabel(labelData.id, labelData);
    } catch (error) {
      console.error('Error handling remote label updated:', error);
    }
  }

  private async handleRemoteLabelDeleted(data: { id: string }): Promise<void> {
    try {
      await this.dbManager.deleteLabel(data.id);
    } catch (error) {
      console.error('Error handling remote label deleted:', error);
    }
  }

  private async handleRemoteSettingsUpdated(data: { key: string; value: string }): Promise<void> {
    try {
      await this.dbManager.setSetting(data.key, data.value);
    } catch (error) {
      console.error('Error handling remote settings updated:', error);
    }
  }

  // Queue management
  private async processPendingSyncQueue(): Promise<void> {
    while (this.pendingSyncQueue.length > 0) {
      const event = this.pendingSyncQueue.shift();
      if (event) {
        this.sendMessage(event);
      }
    }
  }

  // Public methods
  public getStatus(): SyncStatus {
    return this.status;
  }

  public async forceFullSync(): Promise<void> {
    if (!this.dbManager.isCloudConnected()) {
      throw new Error('Cloud database not connected');
    }

    this.emitStatusChange(SyncStatus.SYNCING);
    
    try {
      await this.dbManager.forceSync();
      await this.saveLastSyncTimestamp();
      this.emitStatusChange(SyncStatus.CONNECTED);
      
      this.broadcastChange('FULL_SYNC', { deviceId: this.deviceId });
    } catch (error) {
      this.emitStatusChange(SyncStatus.ERROR);
      throw error;
    }
  }

  public disconnect(): void {
    this.stopPeriodicSync();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.emitStatusChange(SyncStatus.DISCONNECTED);
  }

  // Conflict resolution methods
  public async resolveConflict(conflict: ConflictData, useLocal: boolean): Promise<void> {
    const value = useLocal ? conflict.localData : conflict.remoteData;
    
    switch (conflict.type) {
      case 'session':
        await this.dbManager.updateSession(conflict.id, { [conflict.field]: value });
        break;
      case 'label':
        await this.dbManager.updateLabel(conflict.id, { [conflict.field]: value });
        break;
      case 'profile':
        await this.dbManager.updateTimerProfile(conflict.id, { [conflict.field]: value });
        break;
      case 'setting':
        await this.dbManager.setSetting(conflict.id, value);
        break;
    }

    // Broadcast the resolution
    this.broadcastChange('CONFLICT_DETECTED', {
      resolved: true,
      conflict,
      resolution: useLocal ? 'local' : 'remote'
    });
  }
}

export default RealtimeSyncManager;