// Service worker registration and management for background sync

class SyncServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/sync-sw.js', {
        scope: '/'
      });

      console.log('Sync Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('New sync service worker available');
      });

      // Setup message handling
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

    } catch (error) {
      console.error('Sync Service Worker registration failed:', error);
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data.source === 'background-sync-worker') {
      // Forward messages to main app for UI updates
      window.dispatchEvent(new CustomEvent('sync-status-update', {
        detail: event.data
      }));
    }
  }

  async queueSyncOperation(operation: 'INSERT' | 'UPDATE' | 'DELETE', type: 'session' | 'label' | 'profile' | 'setting', data: any): Promise<void> {
    if (!this.registration || !this.registration.active) {
      console.warn('Service worker not active, cannot queue sync operation');
      return;
    }

    this.registration.active.postMessage({
      type: 'QUEUE_SYNC_OPERATION',
      data: {
        operation,
        type,
        data
      }
    });
  }

  async processSyncQueue(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      console.warn('Service worker not active, cannot process sync queue');
      return;
    }

    this.registration.active.postMessage({
      type: 'PROCESS_SYNC_QUEUE'
    });
  }

  async getSyncStatus(): Promise<{ queueLength: number; syncInProgress: boolean }> {
    if (!this.registration || !this.registration.active) {
      return { queueLength: 0, syncInProgress: false };
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_SYNC_STATUS' },
        [channel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        resolve({ queueLength: 0, syncInProgress: false });
      }, 5000);
    });
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      return;
    }

    this.registration.active.postMessage({
      type: 'CLEAR_SYNC_QUEUE'
    });
  }

  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    );
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// Create the service worker file content
export const createSyncServiceWorkerFile = (): string => {
  return `
// Sync Service Worker for background data synchronization
importScripts('./src/sync/backgroundSyncWorker.js');

self.addEventListener('install', (event) => {
  console.log('Sync Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Sync Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// The actual sync logic is handled by backgroundSyncWorker
// which is imported above
`;
};

export default SyncServiceWorkerManager;