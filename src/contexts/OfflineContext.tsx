import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SyncStatus, OfflineAction } from '../types';
import { OfflineDatabase } from '../lib/offline/database';
import { useLanguage } from '../lib/i18n';
import toast from 'react-hot-toast';

interface OfflineContextValue {
  isOnline: boolean;
  syncStatus: SyncStatus;
  queueAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'attempts'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearFailedActions: () => Promise<void>;
  getPendingActionsCount: () => Promise<number>;
  getFailedActionsCount: () => Promise<number>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: new Date(0),
    pendingActions: 0,
    failedActions: 0,
    isOnline: navigator.onLine,
    isSyncing: false,
  });

  const { t } = useLanguage();
  const offlineDb = OfflineDatabase.getInstance();

  // Update online status
  const updateOnlineStatus = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setSyncStatus(prev => ({ ...prev, isOnline: online }));

    if (online) {
      toast.success('Conexión restaurada', { id: 'connection-restored' });
      // Auto-sync when coming online
      syncPendingActions();
    } else {
      toast.error('Sin conexión a internet', { id: 'connection-lost' });
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  // Initialize sync status
  useEffect(() => {
    const initializeSyncStatus = async () => {
      try {
        const pendingCount = await offlineDb.getPendingActionsCount();
        const failedCount = await offlineDb.getFailedActionsCount();
        const lastSync = await offlineDb.getLastSyncTime();

        setSyncStatus(prev => ({
          ...prev,
          pendingActions: pendingCount,
          failedActions: failedCount,
          lastSync: lastSync || new Date(0),
        }));
      } catch (error) {
        console.error('Failed to initialize sync status:', error);
      }
    };

    initializeSyncStatus();
  }, []);

  // Periodic sync when online
  useEffect(() => {
    if (!isOnline) return;

    const syncInterval = setInterval(() => {
      syncPendingActions();
    }, 30000); // Sync every 30 seconds when online

    return () => clearInterval(syncInterval);
  }, [isOnline]);

  const queueAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'attempts'>) => {
    try {
      const fullAction: OfflineAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        attempts: 0,
      };

      await offlineDb.addOfflineAction(fullAction);

      setSyncStatus(prev => ({
        ...prev,
        pendingActions: prev.pendingActions + 1,
      }));

      // If online, try to sync immediately
      if (isOnline) {
        syncPendingActions();
      } else {
        toast.success('Acción guardada para sincronizar más tarde', {
          icon: '💾',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      toast.error('Error al guardar acción offline');
    }
  };

  const syncPendingActions = async () => {
    if (!isOnline || syncStatus.isSyncing) return;

    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));

      const pendingActions = await offlineDb.getPendingActions();
      
      if (pendingActions.length === 0) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
        }));
        return;
      }

      toast.loading(`Sincronizando ${pendingActions.length} acciones...`, {
        id: 'sync-progress',
      });

      let successCount = 0;
      let failCount = 0;

      for (const action of pendingActions) {
        try {
          await syncSingleAction(action);
          await offlineDb.removeOfflineAction(action.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          // Update attempt count and mark as failed if max attempts reached
          const updatedAction = {
            ...action,
            attempts: action.attempts + 1,
            lastAttempt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          if (updatedAction.attempts >= 3) {
            await offlineDb.markActionAsFailed(updatedAction);
            failCount++;
          } else {
            await offlineDb.updateOfflineAction(updatedAction);
          }
        }
      }

      // Update sync status
      const newPendingCount = await offlineDb.getPendingActionsCount();
      const newFailedCount = await offlineDb.getFailedActionsCount();

      setSyncStatus(prev => ({
        ...prev,
        pendingActions: newPendingCount,
        failedActions: newFailedCount,
        lastSync: new Date(),
        isSyncing: false,
      }));

      toast.dismiss('sync-progress');

      if (successCount > 0) {
        toast.success(`${successCount} acciones sincronizadas`, {
          icon: '✅',
        });
      }

      if (failCount > 0) {
        toast.error(`${failCount} acciones fallaron`, {
          icon: '❌',
        });
      }

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      toast.dismiss('sync-progress');
      toast.error('Error durante la sincronización');
    }
  };

  const syncSingleAction = async (action: OfflineAction) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('whatsopi-token');

    const response = await fetch(`${apiUrl}/${action.entity}s`, {
      method: action.type === 'create' ? 'POST' : action.type === 'update' ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: action.type !== 'delete' ? JSON.stringify(action.payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const clearFailedActions = async () => {
    try {
      await offlineDb.clearFailedActions();
      setSyncStatus(prev => ({ ...prev, failedActions: 0 }));
      toast.success('Acciones fallidas eliminadas');
    } catch (error) {
      console.error('Failed to clear failed actions:', error);
      toast.error('Error al limpiar acciones fallidas');
    }
  };

  const getPendingActionsCount = async () => {
    try {
      return await offlineDb.getPendingActionsCount();
    } catch (error) {
      console.error('Failed to get pending actions count:', error);
      return 0;
    }
  };

  const getFailedActionsCount = async () => {
    try {
      return await offlineDb.getFailedActionsCount();
    } catch (error) {
      console.error('Failed to get failed actions count:', error);
      return 0;
    }
  };

  const value: OfflineContextValue = {
    isOnline,
    syncStatus,
    queueAction,
    syncPendingActions,
    clearFailedActions,
    getPendingActionsCount,
    getFailedActionsCount,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextValue => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};