import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { AppSchema } from '@/src/db/Schema';
import { BackendConnector } from '@/src/db/PowerSyncConnector';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSystemStore } from '@/src/store/systemStore';

export function PowerSyncProvider({ children }: PropsWithChildren) {
  const { accessToken } = useAuthStore();
  const setSyncStatus = useSystemStore((state) => state.setSyncStatus);

  const powerSync = useMemo(() => {
    return new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'acadmate_local.db',
      },
    });
  }, []);

  useEffect(() => {
    powerSync.init().catch((error) => {
      console.error('PowerSync init failure:', error);
    });
  }, [powerSync]);

  useEffect(() => {
    if (accessToken) {
      const connector = new BackendConnector();
      powerSync.connect(connector);
      setSyncStatus(true);
    } else {
      powerSync.disconnect();
      setSyncStatus(false);
    }
  }, [accessToken, powerSync, setSyncStatus]);

  return <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>;
}
