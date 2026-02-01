import { STORAGE_KEYS, TWITCH_CLIENT_ID } from "../../shared/constants";
import type { DeviceCodeResponse, TwitchAuthToken } from "./types";

export interface PollingState {
  userCode: string;
  verificationUri: string;
  expiresAt: number;
}

export interface TwitchAuthAPI {
  // Device Code Flow
  startDeviceAuth(): Promise<DeviceCodeResponse>;
  pollForToken(
    deviceCode: string,
    interval: number,
    deviceInfo: { userCode: string; verificationUri: string; expiresIn: number },
  ): Promise<TwitchAuthToken>;
  cancelPolling(): void;

  getPollingState(): PollingState | null;
  awaitNextPoll(): Promise<void>;

  // Token management
  refreshToken(refreshToken: string): Promise<TwitchAuthToken>;
  revokeToken(token: string): Promise<void>;
  getStoredToken(): Promise<TwitchAuthToken | null>;
  storeToken(token: TwitchAuthToken): Promise<void>;
  clearToken(): Promise<void>;
  isTokenExpired(token: TwitchAuthToken): boolean;
}

export function createTwitchAuthAPI(): TwitchAuthAPI {
  let pollingAbortController: AbortController | null = null;
  let currentPollingState: PollingState | null = null;
  let pollWaiters: Array<() => void> = [];

  function notifyPollWaiters(): void {
    for (const resolve of pollWaiters) resolve();
    pollWaiters = [];
  }

  function cleanupPollingState(reason?: string): void {
    notifyPollWaiters();
    pollingAbortController = null;
    currentPollingState = null;
    if (reason) {
      chrome.storage.local.set({
        [STORAGE_KEYS.AUTH_POLLING_STATUS]: { status: "failed", reason },
      });
    }
  }

  return {
    async startDeviceAuth(): Promise<DeviceCodeResponse> {
      const response = await fetch("https://id.twitch.tv/oauth2/device", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          scopes: "", // Public endpoints only, no scope needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Device auth failed: ${errorData.message ?? response.statusText}`);
      }

      return response.json();
    },

    async pollForToken(
      deviceCode: string,
      interval: number,
      deviceInfo: { userCode: string; verificationUri: string; expiresIn: number },
    ): Promise<TwitchAuthToken> {
      pollingAbortController = new AbortController();
      const signal = pollingAbortController.signal;

      currentPollingState = {
        userCode: deviceInfo.userCode,
        verificationUri: deviceInfo.verificationUri,
        expiresAt: Date.now() + deviceInfo.expiresIn * 1000,
      };

      const pollInterval = Math.max(interval, 5) * 1000; // At least 5 seconds

      while (!signal.aborted) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, pollInterval);
          signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Polling cancelled", "AbortError"));
          });
        });

        if (signal.aborted) {
          throw new DOMException("Polling cancelled", "AbortError");
        }

        try {
          const response = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: TWITCH_CLIENT_ID,
              device_code: deviceCode,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
            signal,
          });

          if (response.ok) {
            const tokenData = await response.json();
            const token: TwitchAuthToken = {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_in: tokenData.expires_in,
              scope: tokenData.scope ?? [],
              token_type: tokenData.token_type,
              obtained_at: Date.now(),
            };

            await this.storeToken(token);
            notifyPollWaiters();
            pollingAbortController = null;
            currentPollingState = null;
            chrome.storage.local.set({
              [STORAGE_KEYS.AUTH_POLLING_STATUS]: { status: "completed" },
            });
            return token;
          }

          const errorData = await response.json();

          // Handle specific error cases
          if (errorData.message === "authorization_pending") {
            // User hasn't authorized yet, continue polling
            notifyPollWaiters();
            continue;
          }

          if (errorData.message === "slow_down") {
            // Need to slow down polling
            await new Promise((resolve) => setTimeout(resolve, 5000));
            notifyPollWaiters();
            continue;
          }

          if (errorData.message === "expired_token") {
            cleanupPollingState("expired_token");
            throw new Error("Device code expired. Please start again.");
          }

          if (errorData.message === "access_denied") {
            cleanupPollingState("access_denied");
            throw new Error("Authorization denied by user.");
          }

          // Unknown error
          cleanupPollingState(errorData.message ?? "unknown_error");
          throw new Error(`Token polling failed: ${errorData.message ?? response.statusText}`);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            throw err;
          }
          cleanupPollingState("network_error");
          throw err;
        }
      }

      throw new DOMException("Polling cancelled", "AbortError");
    },

    cancelPolling(): void {
      if (pollingAbortController) {
        pollingAbortController.abort();
        pollingAbortController = null;
      }
      currentPollingState = null;
      notifyPollWaiters();
      chrome.storage.local.set({
        [STORAGE_KEYS.AUTH_POLLING_STATUS]: { status: "failed", reason: "cancelled" },
      });
    },

    awaitNextPoll(): Promise<void> {
      if (!pollingAbortController) return Promise.resolve();
      return new Promise<void>((resolve) => {
        pollWaiters.push(resolve);
      });
    },

    getPollingState(): PollingState | null {
      if (!currentPollingState) return null;
      if (Date.now() >= currentPollingState.expiresAt) {
        currentPollingState = null;
        return null;
      }
      return currentPollingState;
    },

    async refreshToken(refreshToken: string): Promise<TwitchAuthToken> {
      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token refresh failed: ${errorData.message ?? response.statusText}`);
      }

      const tokenData = await response.json();
      const token: TwitchAuthToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope ?? [],
        token_type: tokenData.token_type,
        obtained_at: Date.now(),
      };

      await this.storeToken(token);
      return token;
    },

    async revokeToken(token: string): Promise<void> {
      await fetch("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          token,
        }),
      });
    },

    async getStoredToken(): Promise<TwitchAuthToken | null> {
      const result = await chrome.storage.local.get(STORAGE_KEYS.TWITCH_AUTH);
      return (result[STORAGE_KEYS.TWITCH_AUTH] as TwitchAuthToken) ?? null;
    },

    async storeToken(token: TwitchAuthToken): Promise<void> {
      await chrome.storage.local.set({ [STORAGE_KEYS.TWITCH_AUTH]: token });
    },

    async clearToken(): Promise<void> {
      await chrome.storage.local.remove(STORAGE_KEYS.TWITCH_AUTH);
    },

    isTokenExpired(token: TwitchAuthToken): boolean {
      const expiresAt = token.obtained_at + token.expires_in * 1000;
      // Consider expired if less than 5 minutes remaining
      return Date.now() > expiresAt - 5 * 60 * 1000;
    },
  };
}
