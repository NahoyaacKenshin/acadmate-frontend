import {
    AbstractPowerSyncDatabase,
    PowerSyncBackendConnector,
    PowerSyncCredentials,
} from "@powersync/react-native";
import { ENV } from "@/src/config/env";
import { useAuthStore } from "@/src/features/auth/auth.store";

export class BackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;

    try {
      const response = await fetch(
        `${ENV.API_URL}/auth/powersync-token`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) return null;

      const data = await response.json();
      return {
        endpoint: "https://YOUR_POWERSYNC_INSTANCE_URL.powersync.app",
        token: data.powerSyncToken,
      };
    } catch (error) {
      console.error("Credentials fetch failure:", error);
      return null;
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const batch = await database.getCrudBatch();
    if (!batch) return;

    for (const op of batch.crud) {
      const url = `${ENV.API_URL}/sync/${op.table}`;

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: op.op, id: op.id, data: op.opData }),
      });
    }

    await batch.complete();
  }
}
