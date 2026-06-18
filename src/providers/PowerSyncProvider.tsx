import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { AppSchema } from '@/src/db/Schema';

export function PowerSyncProvider({ children }: PropsWithChildren) {
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

  return <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>;
}
