import {
    AbstractPowerSyncDatabase,
    PowerSyncBackendConnector,
    PowerSyncCredentials,
} from "@powersync/react-native";
import { ENV } from "@/src/config/env";
import { useAuthStore } from "@/src/features/auth/auth.store";

export class BackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    let token = useAuthStore.getState().accessToken;
    console.log("PowerSync: Checking access token...", !!token);
    if (!token) return null;

    try {
      const creds = await this._fetchPowerSyncToken(token);
      if (creds !== 'UNAUTHORIZED') return creds;

      // Access token is expired — attempt a silent refresh
      console.log("PowerSync: Access token expired, attempting refresh...");
      const refreshed = await useAuthStore.getState().refreshSession();
      if (!refreshed) {
        console.warn("PowerSync: Token refresh failed, user will need to log in again.");
        return null;
      }

      // Retry once with the new token
      token = useAuthStore.getState().accessToken;
      if (!token) return null;
      const retried = await this._fetchPowerSyncToken(token);
      return retried === 'UNAUTHORIZED' ? null : retried;
    } catch (error) {
      console.error("PowerSync: Credentials fetch failure exception:", error);
      return null;
    }
  }

  /** Fetches a PowerSync JWT from the backend. Returns 'UNAUTHORIZED' on 401/403. */
  private async _fetchPowerSyncToken(token: string): Promise<PowerSyncCredentials | 'UNAUTHORIZED'> {
    console.log(`PowerSync: Fetching token from ${ENV.API_URL}/auth/v1/powersync-token`);
    const response = await fetch(
      `${ENV.API_URL}/auth/v1/powersync-token`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    console.log("PowerSync: Response status:", response.status);

    if (response.status === 401 || response.status === 403) {
      return 'UNAUTHORIZED';
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("PowerSync: Fetch failed with text:", text);
      throw new Error(`PowerSync token fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("PowerSync: Successfully got credentials! Connecting to:", ENV.POWERSYNC_URL);
    return {
      endpoint: ENV.POWERSYNC_URL,
      token: data.token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    let token = useAuthStore.getState().accessToken;
    if (!token) return;

    const batch = await database.getCrudBatch();
    if (!batch) return;

    for (const op of batch.crud) {
      const url = `${ENV.API_URL}/sync/${op.table}`;

      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: op.op, id: op.id, data: op.opData }),
      });

      // Retry once after a token refresh on 401
      if (response.status === 401 || response.status === 403) {
        const refreshed = await useAuthStore.getState().refreshSession();
        if (!refreshed) throw new Error("Upload failed: session expired.");
        token = useAuthStore.getState().accessToken ?? '';
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: op.op, id: op.id, data: op.opData }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed for ${op.table}: ${response.status} - ${errorText}`);
      }
    }

    await batch.complete();
  }
}
