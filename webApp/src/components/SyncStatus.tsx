import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock,
  Cloud,
  CloudOff,
  Loader2
} from 'lucide-react';
import RealtimeSyncManager, { SyncStatus as SyncStatusEnum, ConflictData } from '../sync/realtimeSyncManager';

interface SyncStatusProps {
  syncManager: RealtimeSyncManager;
  className?: string;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ syncManager, className = '' }) => {
  const [status, setStatus] = useState<SyncStatusEnum>(syncManager.getStatus());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueueLength, setSyncQueueLength] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Listen to sync status changes
    const handleStatusChange = (newStatus: SyncStatusEnum) => {
      setStatus(newStatus);
      if (newStatus === SyncStatusEnum.CONNECTED) {
        setLastSyncTime(new Date());
      }
    };

    const handleSyncEvent = () => {
      setLastSyncTime(new Date());
    };

    const handleConflict = (_conflict: ConflictData) => {
      setConflictCount(prev => prev + 1);
    };

    // Listen to network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen to service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.source === 'background-sync-worker') {
        switch (event.data.type) {
          case 'SYNC_STARTED':
            setSyncQueueLength(event.data.queueLength);
            break;
          case 'SYNC_COMPLETED':
            setSyncQueueLength(event.data.remaining);
            setLastSyncTime(new Date());
            break;
        }
      }
    };

    syncManager.onStatusChange(handleStatusChange);
    syncManager.onSyncEvent(handleSyncEvent);
    syncManager.onConflict(handleConflict);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [syncManager]);

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    switch (status) {
      case SyncStatusEnum.CONNECTED:
        return <Wifi className="w-4 h-4 text-green-500" />;
      case SyncStatusEnum.CONNECTING:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case SyncStatusEnum.SYNCING:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case SyncStatusEnum.ERROR:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case SyncStatusEnum.DISCONNECTED:
      default:
        return <CloudOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    switch (status) {
      case SyncStatusEnum.CONNECTED:
        return 'Connected';
      case SyncStatusEnum.CONNECTING:
        return 'Connecting...';
      case SyncStatusEnum.SYNCING:
        return 'Syncing...';
      case SyncStatusEnum.ERROR:
        return 'Error';
      case SyncStatusEnum.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'text-red-600 bg-red-50 border-red-200';
    }

    switch (status) {
      case SyncStatusEnum.CONNECTED:
        return 'text-green-600 bg-green-50 border-green-200';
      case SyncStatusEnum.CONNECTING:
      case SyncStatusEnum.SYNCING:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case SyncStatusEnum.ERROR:
        return 'text-red-600 bg-red-50 border-red-200';
      case SyncStatusEnum.DISCONNECTED:
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleForceSync = async () => {
    try {
      // First trigger bidirectional sync via DatabaseManager
      const dbManager = (await import('../database/database')).default.getInstance();
      await dbManager.performBidirectionalSync();
      
      // Then trigger real-time sync
      await syncManager.forceFullSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className={`sync-status ${className}`}>
      {/* Compact status indicator */}
      <div 
        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium cursor-pointer transition-all ${getStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        
        {syncQueueLength > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
            {syncQueueLength} pending
          </span>
        )}
        
        {conflictCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            {conflictCount} conflicts
          </span>
        )}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Sync Status</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Connection:</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  <span className={getStatusText() === 'Connected' ? 'text-green-600' : 'text-gray-600'}>
                    {getStatusText()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Network:</span>
                <div className="flex items-center space-x-1">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last sync:</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{formatLastSyncTime()}</span>
                </div>
              </div>

              {syncQueueLength > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending items:</span>
                  <span className="text-orange-600 font-medium">{syncQueueLength}</span>
                </div>
              )}

              {conflictCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Conflicts:</span>
                  <span className="text-red-600 font-medium">{conflictCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4">
            <div className="flex space-x-2">
              <button
                onClick={handleForceSync}
                disabled={!isOnline || status === SyncStatusEnum.SYNCING}
                className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${status === SyncStatusEnum.SYNCING ? 'animate-spin' : ''}`} />
                <span>Force Sync</span>
              </button>

              {conflictCount > 0 && (
                <button
                  onClick={() => {
                    // Handle conflicts - you might want to open a conflict resolution modal
                    console.log('Open conflict resolution');
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Resolve</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection info */}
          <div className="px-4 pb-4 text-xs text-gray-500">
            {status === SyncStatusEnum.CONNECTED && (
              <div className="flex items-center space-x-1">
                <Cloud className="w-3 h-3" />
                <span>Real-time sync active</span>
              </div>
            )}
            
            {!isOnline && syncQueueLength > 0 && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Clock className="w-3 h-3" />
                <span>Changes will sync when online</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;