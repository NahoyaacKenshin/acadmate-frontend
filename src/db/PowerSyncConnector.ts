import {
    AbstractPowerSyncDatabase,
    PowerSyncBackendConnector,
    PowerSyncCredentials,
} from "@powersync/react-native";
import { ENV } from "@/src/config/env";

export class BackendConnector implements PowerSyncBackendConnector {
  private jwtToken: string | null = null;

  constructor(token: string) {
    this.jwtToken = token;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    try {
      const response = await fetch(
        `${ENV.API_URL}/auth/powersync-token`,
        {
          headers: { Authorization: `Bearer ${this.jwtToken}` },
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
    const batch = await database.getCrudBatch();
    if (!batch) return;

    for (const op of batch.crud) {
      const url = `${ENV.API_URL}/sync/${op.table}`;

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.jwtToken}`,
        },
        body: JSON.stringify({ action: op.op, id: op.id, data: op.opData }),
      });
    }

    await batch.complete();
  }
}
