import { useState, useEffect } from 'react';
import DatabaseManager from '../database/database';

export interface BackgroundSyncStatus {
  isConnecting: boolean;
  isSyncing: boolean;
  isComplete: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}

export function useBackgroundSync() {
  const [status, setStatus] = useState<BackgroundSyncStatus>({
    isConnecting: true,
    isSyncing: false,
    isComplete: false,
    error: null,
    lastSyncTime: null
  });

  useEffect(() => {
    const dbManager = DatabaseManager.getInstance();
    let checkInterval: NodeJS.Timeout;

    const updateStatus = async () => {
      try {
        const syncStatus = await dbManager.getStartupSyncStatus();
        
        if (syncStatus) {
          setStatus({
            isConnecting: !syncStatus.cloudConnected && !syncStatus.isInitialized,
            isSyncing: syncStatus.cloudConnected && !syncStatus.isInitialized,
            isComplete: syncStatus.isInitialized,
            error: null,
            lastSyncTime: syncStatus.lastStartupSync ? new Date(syncStatus.lastStartupSync) : null
          });
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown sync error'
        }));
      }
    };

    // Check immediately and then periodically
    updateStatus();
    checkInterval = setInterval(updateStatus, 3000);

    // Stop checking after sync is complete or after 2 minutes max
    const timeout = setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    }, 120000); // 2 minutes

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      clearTimeout(timeout);
    };
  }, []);

  const forceSync = async () => {
    const dbManager = DatabaseManager.getInstance();
    try {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      await dbManager.forceStartupSync();
      setStatus(prev => ({ ...prev, isSyncing: false, isComplete: true }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  };

  return { status, forceSync };
}

export default useBackgroundSync;