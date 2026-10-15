import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { AppSchema } from '@/src/db/Schema';
import { BackendConnector } from '@/src/db/PowerSyncConnector';
import { useAuthStore } from '@/src/features/auth/auth.store';
import { useSystemStore } from '@/src/store/systemStore';

let globalPowerSync: PowerSyncDatabase | null = null;

export function getGlobalPowerSync(): PowerSyncDatabase | null {
  return globalPowerSync;
}

export function PowerSyncProvider({ children }: PropsWithChildren) {
  const { accessToken, isRestoring } = useAuthStore();
  const setSyncStatus = useSystemStore((state) => state.setSyncStatus);

  const powerSync = useMemo(() => {
    const db = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'acadmate_local.db',
      },
    });
    globalPowerSync = db;
    return db;
  }, []);

  useEffect(() => {
    powerSync.init().then(async () => {
      // Normalize legacy violet non-exam events to Light Blue (#0EA5E9)
      try {
        // Normalize study session events to Purple (#8B5CF6)
        await powerSync.execute(
          "UPDATE CalendarEvent SET color = '#8B5CF6' WHERE (location LIKE 'study_session%' OR title LIKE 'Study Session:%' OR title LIKE 'Study:%')"
        );
        // Normalize other non-exam events to Light Blue (#0EA5E9)
        await powerSync.execute(
          "UPDATE CalendarEvent SET color = '#0EA5E9' WHERE color IN ('#6366F1') AND (location IS NULL OR location NOT LIKE 'study_session%') AND (title NOT LIKE 'Study Session:%' AND title NOT LIKE 'Study:%') AND (description IS NULL OR (description NOT LIKE '%exam%' AND description NOT LIKE '🎓%')) AND (title NOT LIKE '%exam%' AND title NOT LIKE '🎓%')"
        );
      } catch {}
    }).catch((error) => {
      console.error('PowerSync init failure:', error);
    });
  }, [powerSync]);

  useEffect(() => {
    if (isRestoring) return;

    if (accessToken) {
      const connector = new BackendConnector();
      powerSync.connect(connector);
      setSyncStatus(true);
    } else {
      powerSync.disconnectAndClear().catch((err) => {
        console.warn('PowerSync disconnectAndClear error:', err);
      });
      setSyncStatus(false);
    }
  }, [accessToken, isRestoring, powerSync, setSyncStatus]);

  return <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>;
}
