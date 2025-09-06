// Background sync worker for offline sync operations

declare const self: any; // ServiceWorker global scope

interface QueuedSyncOperation {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  type: 'session' | 'label' | 'profile' | 'setting';
  data: any;
  timestamp: number;
  retryCount: number;
}

class BackgroundSyncWorker {
  private syncQueue: QueuedSyncOperation[] = [];
  private maxRetries = 3;
  private syncInProgress = false;

  constructor() {
    this.loadSyncQueue();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for background sync events
    self.addEventListener('sync', this.handleBackgroundSync.bind(this));
    
    // Listen for messages from main thread
    self.addEventListener('message', this.handleMessage.bind(this));
    
    // Listen for network status changes
    self.addEventListener('online', this.handleOnline.bind(this));
  }

  private async handleBackgroundSync(event: any): Promise<void> {
    if (event.tag === 'sync-pomodoro-data') {
      event.waitUntil(this.processSyncQueue());
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const { type, data } = event.data;
    
    switch (type) {
      case 'QUEUE_SYNC_OPERATION':
        await this.queueSyncOperation(data);
        break;
      case 'PROCESS_SYNC_QUEUE':
        await this.processSyncQueue();
        break;
      case 'GET_SYNC_STATUS':
        event.ports[0].postMessage({
          queueLength: this.syncQueue.length,
          syncInProgress: this.syncInProgress
        });
        break;
      case 'CLEAR_SYNC_QUEUE':
        await this.clearSyncQueue();
        break;
    }
  }

  private async handleOnline(): Promise<void> {
    // When coming back online, process the sync queue
    await this.processSyncQueue();
  }

  // Queue management
  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await this.getStoredData('syncQueue');
      this.syncQueue = stored || [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await this.setStoredData('syncQueue', this.syncQueue);
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  // Storage utilities
  private async getStoredData(key: string): Promise<any> {
    return new Promise((resolve) => {
      const request = indexedDB.open('GoodtimeDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['syncQueue'], 'readonly');
        const store = transaction.objectStore('syncQueue');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.data || null);
        };
        
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onerror = () => {
        resolve(null);
      };
    });
  }

  private async setStoredData(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GoodtimeDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        store.put({ key, data });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Sync operations
  public async queueSyncOperation(operation: Omit<QueuedSyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedOp: QueuedSyncOperation = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0,
      ...operation
    };

    this.syncQueue.push(queuedOp);
    await this.saveSyncQueue();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    } else {
      // Register background sync for when we come back online
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if ('sync' in registration) {
            await (registration as any).sync.register('sync-pomodoro-data');
          }
        } catch (error) {
          console.error('Failed to register background sync:', error);
        }
      }
    }
  }

  public async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    
    // Notify main thread that sync started
    this.postMessage({ type: 'SYNC_STARTED', queueLength: this.syncQueue.length });

    const baseUrl = await this.getStoredData('apiBaseUrl') || 'http://localhost:3001/api';
    let processedCount = 0;
    let failedCount = 0;

    // Process operations in chronological order
    const operationsToProcess = [...this.syncQueue].sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of operationsToProcess) {
      try {
        const success = await this.processSingleOperation(operation, baseUrl);
        
        if (success) {
          // Remove from queue
          this.syncQueue = this.syncQueue.filter(op => op.id !== operation.id);
          processedCount++;
        } else {
          // Increment retry count
          const queueIndex = this.syncQueue.findIndex(op => op.id === operation.id);
          if (queueIndex !== -1) {
            this.syncQueue[queueIndex].retryCount++;
            
            // Remove if max retries exceeded
            if (this.syncQueue[queueIndex].retryCount >= this.maxRetries) {
              this.syncQueue.splice(queueIndex, 1);
              failedCount++;
            }
          }
        }
      } catch (error) {
        console.error('Error processing sync operation:', error);
        failedCount++;
      }
    }

    await this.saveSyncQueue();
    this.syncInProgress = false;

    // Notify main thread that sync completed
    this.postMessage({
      type: 'SYNC_COMPLETED',
      processed: processedCount,
      failed: failedCount,
      remaining: this.syncQueue.length
    });
  }

  private async processSingleOperation(operation: QueuedSyncOperation, baseUrl: string): Promise<boolean> {
    try {
      let url: string = '';
      let method: string = '';
      let body: any = null;

      // Construct API request based on operation
      switch (operation.type) {
        case 'session':
          url = `${baseUrl}/sessions`;
          if (operation.operation === 'INSERT') {
            method = 'POST';
            body = operation.data;
          } else if (operation.operation === 'UPDATE') {
            method = 'PUT';
            url += `/${operation.data.id}`;
            body = operation.data;
          } else if (operation.operation === 'DELETE') {
            method = 'DELETE';
            url += `/${operation.data.id}`;
          }
          break;

        case 'label':
          url = `${baseUrl}/labels`;
          if (operation.operation === 'INSERT') {
            method = 'POST';
            body = operation.data;
          } else if (operation.operation === 'UPDATE') {
            method = 'PUT';
            url += `/${operation.data.id}`;
            body = operation.data;
          } else if (operation.operation === 'DELETE') {
            method = 'DELETE';
            url += `/${operation.data.id}`;
          }
          break;

        case 'profile':
          url = `${baseUrl}/timer-profiles`;
          if (operation.operation === 'INSERT') {
            method = 'POST';
            body = operation.data;
          } else if (operation.operation === 'UPDATE') {
            method = 'PUT';
            url += `/${operation.data.name}`;
            body = operation.data;
          } else if (operation.operation === 'DELETE') {
            method = 'DELETE';
            url += `/${operation.data.name}`;
          }
          break;

        case 'setting':
          url = `${baseUrl}/settings/${operation.data.key}`;
          method = 'PUT';
          body = { key: operation.data.key, value: operation.data.value };
          break;

        default:
          console.error('Unknown operation type:', operation.type);
          return false;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (response.ok) {
        console.log('Sync operation successful:', operation.id);
        return true;
      } else {
        console.error('Sync operation failed:', response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error('Error in sync operation:', error);
      return false;
    }
  }

  // Communication with main thread
  private postMessage(message: any): void {
    // Broadcast to all clients
    self.clients.matchAll().then((clients: any[]) => {
      clients.forEach((client: any) => {
        client.postMessage({
          source: 'background-sync-worker',
          ...message
        });
      });
    });
  }

  // Conflict detection for offline changes
  public async detectOfflineConflicts(): Promise<any[]> {
    const conflicts: any[] = [];
    const baseUrl = await this.getStoredData('apiBaseUrl') || 'http://localhost:3001/api';

    try {
      // Get server version of data modified while offline
      const lastOnlineTimestamp = await this.getStoredData('lastOnlineTimestamp') || 0;
      
      const response = await fetch(`${baseUrl}/sync/changes?since=${lastOnlineTimestamp}`);
      if (response.ok) {
        const serverChanges = await response.json();
        
        // Check each queued operation against server changes
        for (const operation of this.syncQueue) {
          const serverChange = serverChanges.find((change: any) => 
            change.type === operation.type && 
            change.id === operation.data.id
          );
          
          if (serverChange) {
            conflicts.push({
              operation,
              serverChange,
              type: 'OFFLINE_CONFLICT'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error detecting offline conflicts:', error);
    }

    return conflicts;
  }

  // Cleanup old operations
  public async cleanupOldOperations(): Promise<void> {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffTime = Date.now() - maxAge;
    
    this.syncQueue = this.syncQueue.filter(op => op.timestamp > cutoffTime);
    await this.saveSyncQueue();
  }
}

// Initialize the background sync worker
const backgroundSyncWorker = new BackgroundSyncWorker();

export default backgroundSyncWorker;