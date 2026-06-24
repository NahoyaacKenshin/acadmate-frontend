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
    console.log("PowerSync: Checking access token...", !!token);
    if (!token) return null;

    try {
      console.log(`PowerSync: Fetching token from ${ENV.API_URL}/auth/v1/powersync-token`);
      const response = await fetch(
        `${ENV.API_URL}/auth/v1/powersync-token`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("PowerSync: Response status:", response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error("PowerSync: Fetch failed with text:", text);
        return null;
      }

      const data = await response.json();
      console.log("PowerSync: Successfully got credentials! Connecting to:", ENV.POWERSYNC_URL);
      return {
        endpoint: ENV.POWERSYNC_URL,
        token: data.token,
      };
    } catch (error) {
      console.error("PowerSync: Credentials fetch failure exception:", error);
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
