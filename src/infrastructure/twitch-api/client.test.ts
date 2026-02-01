import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { TwitchAuthAPI } from "./auth";
import { createTwitchApiClient } from "./client";
import { TwitchApiError, type TwitchAuthToken } from "./types";

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

function createMockAuth(): { [K in keyof TwitchAuthAPI]: Mock } {
  return {
    startDeviceAuth: vi.fn(),
    pollForToken: vi.fn(),
    cancelPolling: vi.fn(),
    refreshToken: vi.fn(),
    revokeToken: vi.fn(),
    getStoredToken: vi.fn(),
    storeToken: vi.fn(),
    clearToken: vi.fn(),
    isTokenExpired: vi.fn(),
  };
}

function mockJsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: vi.fn().mockResolvedValue(data),
    headers: headersObj,
  };
}

describe("createTwitchApiClient", () => {
  let auth: ReturnType<typeof createMockAuth>;
  let client: ReturnType<typeof createTwitchApiClient>;

  beforeEach(() => {
    auth = createMockAuth();
    client = createTwitchApiClient({ auth });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    it("throws 401 when no token available", async () => {
      auth.getStoredToken.mockResolvedValue(null);

      await expect(client.get("/users")).rejects.toThrow(TwitchApiError);
      await expect(client.get("/users")).rejects.toThrow("Not authenticated");
    });

    it("uses stored token for requests", async () => {
      const token = createToken();
      auth.getStoredToken.mockResolvedValue(token);
      auth.isTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [] }));

      await client.get("/users");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token.access_token}`,
          }),
        }),
      );
    });

    it("refreshes expired token automatically", async () => {
      const oldToken = createToken({ access_token: "old" });
      const newToken = createToken({ access_token: "new" });
      auth.getStoredToken.mockResolvedValue(oldToken);
      auth.isTokenExpired.mockReturnValue(true);
      auth.refreshToken.mockResolvedValue(newToken);
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [] }));

      await client.get("/users");

      expect(auth.refreshToken).toHaveBeenCalledWith(oldToken.refresh_token);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer new",
          }),
        }),
      );
    });

    it("clears token and returns null on refresh failure", async () => {
      const oldToken = createToken();
      auth.getStoredToken.mockResolvedValue(oldToken);
      auth.isTokenExpired.mockReturnValue(true);
      auth.refreshToken.mockRejectedValue(new Error("refresh failed"));

      await expect(client.get("/users")).rejects.toThrow("Not authenticated");
      expect(auth.clearToken).toHaveBeenCalled();
    });
  });

  describe("API requests", () => {
    beforeEach(() => {
      const token = createToken();
      auth.getStoredToken.mockResolvedValue(token);
      auth.isTokenExpired.mockReturnValue(false);
    });

    it("sends correct headers", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [] }));

      await client.get("/users");

      const [, options] = mockFetch.mock.calls[0] ?? [];
      expect(options.headers.Authorization).toBe("Bearer test_access_token");
      expect(options.headers["Client-Id"]).toBeTruthy();
    });

    it("builds URL with query params", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [] }));

      await client.get("/users", { login: "testuser" });

      const [url] = mockFetch.mock.calls[0] ?? [];
      expect(url).toContain("/users");
      expect(url).toContain("login=testuser");
    });

    it("returns parsed JSON response", async () => {
      const responseData = { data: [{ id: "123", login: "test" }] };
      mockFetch.mockResolvedValue(mockJsonResponse(responseData));

      const result = await client.get("/users");
      expect(result).toEqual(responseData);
    });
  });

  describe("rate limiting", () => {
    beforeEach(() => {
      const token = createToken();
      auth.getStoredToken.mockResolvedValue(token);
      auth.isTokenExpired.mockReturnValue(false);
    });

    it("tracks rate limit info from headers", async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ data: [] }, 200, {
          "Ratelimit-Limit": "800",
          "Ratelimit-Remaining": "750",
          "Ratelimit-Reset": String(Math.floor(Date.now() / 1000) + 60),
        }),
      );

      await client.get("/users");

      const info = client.getRateLimitInfo();
      expect(info.limit).toBe(800);
      expect(info.remaining).toBe(750);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      const token = createToken();
      auth.getStoredToken.mockResolvedValue(token);
      auth.isTokenExpired.mockReturnValue(false);
    });

    it("throws TwitchApiError on non-OK response", async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ message: "User not found", error: "Not Found" }, 404),
      );

      await expect(client.get("/users")).rejects.toThrow(TwitchApiError);
    });

    it("parses error body (message, error code)", async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ message: "User not found", error: "Not Found" }, 404),
      );

      try {
        await client.get("/users");
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TwitchApiError);
        const apiError = error as TwitchApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.message).toBe("User not found");
        expect(apiError.code).toBe("Not Found");
      }
    });

    it("handles unparseable error body gracefully", async () => {
      const headersObj = new Headers();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        headers: headersObj,
      });

      try {
        await client.get("/users");
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TwitchApiError);
        const apiError = error as TwitchApiError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe("Internal Server Error");
      }
    });
  });

  describe("getRateLimitInfo", () => {
    it("returns copy of rate limit state", () => {
      const info = client.getRateLimitInfo();
      expect(info).toHaveProperty("limit");
      expect(info).toHaveProperty("remaining");
      expect(info).toHaveProperty("resetAt");

      // Mutating returned object should not affect internal state
      info.remaining = 0;
      expect(client.getRateLimitInfo().remaining).not.toBe(0);
    });

    it("isAuthenticated returns true when token is valid", async () => {
      const token = createToken();
      auth.getStoredToken.mockResolvedValue(token);
      auth.isTokenExpired.mockReturnValue(false);

      expect(await client.isAuthenticated()).toBe(true);
    });

    it("isAuthenticated returns false when no token", async () => {
      auth.getStoredToken.mockResolvedValue(null);

      expect(await client.isAuthenticated()).toBe(false);
    });
  });
});
