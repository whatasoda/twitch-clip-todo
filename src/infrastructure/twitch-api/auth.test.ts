import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../../shared/constants";
import { createTwitchAuthAPI } from "./auth";
import type { TwitchAuthToken } from "./types";

// Mock chrome.storage.local
const storageData: Record<string, unknown> = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storageData[key] ?? undefined })),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(storageData, data);
      }),
      remove: vi.fn(async (key: string) => {
        delete storageData[key];
      }),
    },
  },
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createToken(overrides?: Partial<TwitchAuthToken>): TwitchAuthToken {
  return {
    access_token: "test_access_token",
    refresh_token: "test_refresh_token",
    expires_in: 14400,
    scope: [],
    token_type: "bearer",
    obtained_at: Date.now(),
    ...overrides,
  };
}

function mockJsonResponse(data: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: vi.fn().mockResolvedValue(data),
  };
}

describe("createTwitchAuthAPI", () => {
  let auth: ReturnType<typeof createTwitchAuthAPI>;

  beforeEach(() => {
    auth = createTwitchAuthAPI();
    vi.clearAllMocks();
    for (const key of Object.keys(storageData)) {
      delete storageData[key];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startDeviceAuth", () => {
    it("calls device endpoint with correct params", async () => {
      const deviceResponse = {
        device_code: "dc1",
        user_code: "UC123",
        verification_uri: "https://id.twitch.tv/activate",
        expires_in: 1800,
        interval: 5,
      };
      mockFetch.mockResolvedValue(mockJsonResponse(deviceResponse));

      const result = await auth.startDeviceAuth();
      expect(result).toEqual(deviceResponse);
      expect(mockFetch).toHaveBeenCalledWith("https://id.twitch.tv/oauth2/device", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: expect.any(URLSearchParams),
      });
    });

    it("throws on non-OK response", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ message: "Invalid client" }, false));

      await expect(auth.startDeviceAuth()).rejects.toThrow("Device auth failed: Invalid client");
    });
  });

  describe("refreshToken", () => {
    it("calls token endpoint with refresh_token grant", async () => {
      const tokenData = {
        access_token: "new_at",
        refresh_token: "new_rt",
        expires_in: 14400,
        scope: [],
        token_type: "bearer",
      };
      mockFetch.mockResolvedValue(mockJsonResponse(tokenData));

      const result = await auth.refreshToken("old_rt");
      expect(result.access_token).toBe("new_at");
      expect(result.refresh_token).toBe("new_rt");
      expect(result.obtained_at).toBeGreaterThan(0);
    });

    it("stores new token", async () => {
      const tokenData = {
        access_token: "new_at",
        refresh_token: "new_rt",
        expires_in: 14400,
        token_type: "bearer",
      };
      mockFetch.mockResolvedValue(mockJsonResponse(tokenData));

      await auth.refreshToken("old_rt");
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("throws on non-OK response", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ message: "Invalid refresh" }, false));

      await expect(auth.refreshToken("bad_rt")).rejects.toThrow(
        "Token refresh failed: Invalid refresh",
      );
    });
  });

  describe("revokeToken", () => {
    it("calls revoke endpoint with token", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse(null));

      await auth.revokeToken("token123");
      expect(mockFetch).toHaveBeenCalledWith("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: expect.any(URLSearchParams),
      });
    });
  });

  describe("token storage", () => {
    it("storeToken saves to chrome.storage.local", async () => {
      const token = createToken();
      await auth.storeToken(token);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.TWITCH_AUTH]: token,
      });
    });

    it("getStoredToken returns stored token", async () => {
      const token = createToken();
      storageData[STORAGE_KEYS.TWITCH_AUTH] = token;

      const result = await auth.getStoredToken();
      expect(result).toEqual(token);
    });

    it("getStoredToken returns null when empty", async () => {
      const result = await auth.getStoredToken();
      expect(result).toBeNull();
    });

    it("clearToken removes from storage", async () => {
      await auth.clearToken();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.TWITCH_AUTH);
    });
  });

  describe("isTokenExpired", () => {
    it("returns false for fresh token", () => {
      const token = createToken({ obtained_at: Date.now(), expires_in: 14400 });
      expect(auth.isTokenExpired(token)).toBe(false);
    });

    it("returns true for expired token", () => {
      const token = createToken({
        obtained_at: Date.now() - 20000 * 1000,
        expires_in: 14400,
      });
      expect(auth.isTokenExpired(token)).toBe(true);
    });

    it("returns true when less than 5 minutes remaining", () => {
      const token = createToken({
        obtained_at: Date.now() - 14200 * 1000, // 14200 of 14400 seconds elapsed (~3 min 20s left)
        expires_in: 14400,
      });
      expect(auth.isTokenExpired(token)).toBe(true);
    });
  });

  describe("cancelPolling", () => {
    it("no-op when no active polling", () => {
      // Should not throw
      expect(() => auth.cancelPolling()).not.toThrow();
    });

    it("writes failed status to storage", () => {
      auth.cancelPolling();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        auth_polling_status: { status: "failed", reason: "cancelled" },
      });
    });
  });

  describe("pollForToken network error handling", () => {
    it("cleans up state and notifies waiters on fetch network error", async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const deviceInfo = {
        userCode: "UC123",
        verificationUri: "https://id.twitch.tv/activate",
        expiresIn: 1800,
      };

      const pollPromise = auth.pollForToken("dc1", 5, deviceInfo).catch((e: Error) => e);

      // Register a waiter before the poll cycle completes
      const waiterPromise = auth.awaitNextPoll();

      // Advance past the poll interval to trigger the fetch
      await vi.advanceTimersByTimeAsync(5000);

      const error = await pollPromise;
      expect(error).toBeInstanceOf(TypeError);
      expect((error as TypeError).message).toBe("Failed to fetch");

      await expect(waiterPromise).resolves.toBeUndefined();

      // Polling state should be cleaned up
      expect(auth.getPollingState()).toBeNull();

      // Should have written network_error to storage
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        auth_polling_status: { status: "failed", reason: "network_error" },
      });

      vi.useRealTimers();
    });
  });

  describe("getPollingState", () => {
    it("returns null when no polling is active", () => {
      expect(auth.getPollingState()).toBeNull();
    });

    it("returns null after cancelPolling", () => {
      // Even without active polling, cancelPolling should clear any state
      auth.cancelPolling();
      expect(auth.getPollingState()).toBeNull();
    });
  });

  describe("awaitNextPoll", () => {
    it("resolves immediately when no polling is active", async () => {
      await expect(auth.awaitNextPoll()).resolves.toBeUndefined();
    });

    it("resolves when cancelPolling is called", async () => {
      // Start polling (will hang on the interval sleep)
      mockFetch.mockResolvedValue(mockJsonResponse({ message: "authorization_pending" }, false));

      const deviceInfo = {
        userCode: "UC123",
        verificationUri: "https://id.twitch.tv/activate",
        expiresIn: 1800,
      };

      // Start polling but don't await it (it would block)
      const pollPromise = auth.pollForToken("dc1", 5, deviceInfo).catch(() => {});

      // Wait a tick for polling to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // awaitNextPoll should be pending
      const waiterPromise = auth.awaitNextPoll();

      // Cancel polling — should resolve the waiter
      auth.cancelPolling();

      await expect(waiterPromise).resolves.toBeUndefined();
      await pollPromise;
    });
  });
});
