import { TWITCH_CLIENT_ID } from "../../shared/constants";
import type { TwitchAuthAPI } from "./auth";
import { TwitchApiError, type TwitchApiResponse } from "./types";

const TWITCH_API_BASE = "https://api.twitch.tv/helix";

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface TwitchApiClient {
  get<T>(endpoint: string, params?: Record<string, string>): Promise<TwitchApiResponse<T>>;
  isAuthenticated(): Promise<boolean>;
  getRateLimitInfo(): RateLimitInfo;
}

export interface TwitchApiClientDeps {
  auth: TwitchAuthAPI;
}

export function createTwitchApiClient(deps: TwitchApiClientDeps): TwitchApiClient {
  const { auth } = deps;

  const rateLimitInfo: RateLimitInfo = {
    limit: 800,
    remaining: 800,
    resetAt: 0,
  };

  async function getValidToken(): Promise<string | null> {
    const token = await auth.getStoredToken();
    if (!token) {
      return null;
    }

    if (auth.isTokenExpired(token)) {
      try {
        const newToken = await auth.refreshToken(token.refresh_token);
        return newToken.access_token;
      } catch {
        // Refresh failed, need to re-authenticate
        await auth.clearToken();
        return null;
      }
    }

    return token.access_token;
  }

  function updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get("Ratelimit-Limit");
    const remaining = headers.get("Ratelimit-Remaining");
    const reset = headers.get("Ratelimit-Reset");

    if (limit) rateLimitInfo.limit = parseInt(limit, 10);
    if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
    if (reset) rateLimitInfo.resetAt = parseInt(reset, 10) * 1000;
  }

  async function waitForRateLimit(): Promise<void> {
    if (rateLimitInfo.remaining < 10 && Date.now() < rateLimitInfo.resetAt) {
      const waitMs = rateLimitInfo.resetAt - Date.now() + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return {
    async get<T>(endpoint: string, params?: Record<string, string>): Promise<TwitchApiResponse<T>> {
      const token = await getValidToken();
      if (!token) {
        throw new TwitchApiError(401, "Not authenticated");
      }

      await waitForRateLimit();

      const url = new URL(`${TWITCH_API_BASE}${endpoint}`);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": TWITCH_CLIENT_ID,
        },
      });

      updateRateLimitInfo(response.headers);

      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = rateLimitInfo.resetAt - Date.now() + 100;
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        return this.get(endpoint, params);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TwitchApiError(
          response.status,
          errorData.message ?? response.statusText,
          errorData.error,
        );
      }

      return response.json();
    },

    async isAuthenticated(): Promise<boolean> {
      const token = await getValidToken();
      return token !== null;
    },

    getRateLimitInfo(): RateLimitInfo {
      return { ...rateLimitInfo };
    },
  };
}
