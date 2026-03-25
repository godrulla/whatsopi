import React, { useState } from 'react';
import { WifiOff, RefreshCw, Sync, AlertCircle, CheckCircle } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';
import { useLanguage } from '../../lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

export const OfflineIndicator: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isOnline,
    syncStatus,
    syncPendingActions,
    clearFailedActions,
  } = useOffline();

  const { t } = useLanguage();

  // Don't show if online and no pending actions
  if (isOnline && syncStatus.pendingActions === 0 && syncStatus.failedActions === 0) {
    return null;
  }

  const formatLastSync = () => {
    if (!syncStatus.lastSync || syncStatus.lastSync.getTime() === 0) {
      return 'Nunca';
    }
    return formatDistanceToNow(syncStatus.lastSync, { 
      addSuffix: true, 
      locale: es 
    });
  };

  const handleSync = async () => {
    if (!isOnline || syncStatus.isSyncing) return;
    
    try {
      await syncPendingActions();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.failedActions > 0) return 'bg-yellow-500';
    if (syncStatus.pendingActions > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus.failedActions > 0) return <AlertCircle className="h-4 w-4" />;
    if (syncStatus.pendingActions > 0) return <Sync className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return t('offline.message');
    if (syncStatus.isSyncing) return t('offline.syncInProgress');
    if (syncStatus.failedActions > 0) return `${syncStatus.failedActions} acciones fallaron`;
    if (syncStatus.pendingActions > 0) return t('offline.pendingActions', { count: syncStatus.pendingActions });
    return 'Todo sincronizado';
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm',
      !isOnline && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    )}>
      {/* Main Indicator Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-3 text-left"
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-white',
              getStatusColor()
            )}>
              {getStatusIcon()}
            </div>
            
            <div>
              <p className={cn(
                'text-sm font-medium',
                !isOnline 
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-gray-900 dark:text-white'
              )}>
                {getStatusText()}
              </p>
              
              {!isOnline && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t('offline.description')}
                </p>
              )}
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className={cn(
            'transform transition-transform',
            isExpanded ? 'rotate-180' : 'rotate-0'
          )}>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pb-4 space-y-4">
            {/* Sync Status Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Estado</p>
                  <p className={cn(
                    'font-medium',
                    isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {isOnline ? 'En línea' : 'Sin conexión'}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Última sincronización</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatLastSync()}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Acciones pendientes</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    {syncStatus.pendingActions}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Acciones fallidas</p>
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">
                    {syncStatus.failedActions}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {isOnline && syncStatus.pendingActions > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncStatus.isSyncing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className={cn(
                    'h-4 w-4',
                    syncStatus.isSyncing && 'animate-spin'
                  )} />
                  <span>
                    {syncStatus.isSyncing ? t('offline.syncInProgress') : t('offline.syncNow')}
                  </span>
                </button>
              )}

              {syncStatus.failedActions > 0 && (
                <button
                  onClick={clearFailedActions}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Limpiar fallidas</span>
                </button>
              )}
            </div>

            {/* Offline Tips */}
            {!isOnline && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  💡 Modo Offline Activo
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Puedes seguir navegando y haciendo pedidos</li>
                  <li>• Los cambios se guardarán automáticamente</li>
                  <li>• Todo se sincronizará cuando vuelvas a tener conexión</li>
                  <li>• Algunas funciones como pagos no estarán disponibles</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};