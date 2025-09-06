import React, { useState, useEffect } from 'react';
import DatabaseManager from '../database/database';

interface SyncStatus {
  isCloudConnected: boolean;
  isRealtimeSyncActive: boolean;
  lastStartupSync: number | null;
  isInitialized: boolean;
}

const BackgroundSyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isCloudConnected: false,
    isRealtimeSyncActive: false,
    lastStartupSync: null,
    isInitialized: false
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dbManager = DatabaseManager.getInstance();
    let checkInterval: NodeJS.Timeout;

    const checkSyncStatus = async () => {
      try {
        const status = await dbManager.getStartupSyncStatus();
        if (status) {
          setSyncStatus(status);
          
          // Show indicator when sync is happening or just completed
          setIsVisible(status.isCloudConnected || !status.isInitialized);
          
          // Hide after sync is complete and established
          if (status.isInitialized && status.isCloudConnected) {
            setTimeout(() => setIsVisible(false), 3000);
          }
        }
      } catch (error) {
        console.warn('Failed to check sync status:', error);
      }
    };

    // Check immediately
    checkSyncStatus();

    // Check periodically for first 30 seconds
    checkInterval = setInterval(checkSyncStatus, 2000);
    
    // Stop checking after 30 seconds
    setTimeout(() => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    }, 30000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm z-50">
      {!syncStatus.isCloudConnected ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Connecting to cloud...</span>
        </>
      ) : !syncStatus.isInitialized ? (
        <>
          <div className="animate-pulse rounded-full h-4 w-4 bg-white"></div>
          <span>Syncing data...</span>
        </>
      ) : (
        <>
          <div className="rounded-full h-4 w-4 bg-green-400"></div>
          <span>Synced</span>
        </>
      )}
    </div>
  );
};

export default BackgroundSyncIndicator;