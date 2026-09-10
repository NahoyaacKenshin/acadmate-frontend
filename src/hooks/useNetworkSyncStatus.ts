import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStatus } from '@powersync/react';
import { ENV } from '@/src/config/env';
import { useSystemStore } from '@/src/store/systemStore';

export type NetworkSyncStatus = 'online' | 'syncing' | 'offline';

export function useNetworkSyncStatus(): NetworkSyncStatus {
  const powerSyncStatus = useStatus();
  const setOnlineStatus = useSystemStore((state) => state.setOnlineStatus);
  const setSyncStatus = useSystemStore((state) => state.setSyncStatus);

  // If there's an immediate downloadError from PowerSync and not connected, start as false
  const [hasInternet, setHasInternet] = useState<boolean>(() => {
    if (powerSyncStatus?.connected) return true;
    if (powerSyncStatus?.dataFlowStatus?.downloadError != null) return false;
    return true;
  });

  const isCheckingRef = useRef(false);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return hasInternet;
    isCheckingRef.current = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${ENV.API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.status < 500;
    } catch {
      // If backend is unreachable or timed out, test internet connectivity endpoint
      try {
        const fallbackCtrl = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackCtrl.abort(), 1500);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          signal: fallbackCtrl.signal,
        });
        clearTimeout(fallbackTimeout);
        return true;
      } catch {
        return false;
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [hasInternet]);

  useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      // If PowerSync is already connected, device is definitely online with working data
      if (powerSyncStatus?.connected) {
        if (isMounted) setHasInternet(true);
        return;
      }

      const reachable = await checkConnectivity();
      if (isMounted) {
        setHasInternet(reachable);
      }
    };

    performCheck();

    // Fast 3s interval when disconnected/reconnecting so turning wifi on/off reflects promptly
    const intervalTime = powerSyncStatus?.connected ? 10000 : 3000;
    const interval = setInterval(performCheck, intervalTime);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        performCheck();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [powerSyncStatus?.connected, powerSyncStatus?.dataFlowStatus?.downloadError, checkConnectivity]);

  // Determine current badge state:
  // 1. If data or wifi is OFF -> 'offline'
  // 2. If connected to PowerSync:
  //    - If actively downloading/uploading -> 'syncing'
  //    - Else -> 'online'
  // 3. If data/wifi is ON but PowerSync is in the middle of reconnecting -> 'syncing'
  let status: NetworkSyncStatus;
  if (!hasInternet) {
    status = 'offline';
  } else if (powerSyncStatus?.connected) {
    if (powerSyncStatus.dataFlowStatus?.downloading || powerSyncStatus.dataFlowStatus?.uploading) {
      status = 'syncing';
    } else {
      status = 'online';
    }
  } else {
    // Data or WiFi is on, app is reconnecting/syncing
    status = 'syncing';
  }

  // Synchronize global system store
  useEffect(() => {
    setOnlineStatus(status !== 'offline');
    setSyncStatus(status === 'syncing');
  }, [status, setOnlineStatus, setSyncStatus]);

  return status;
}
