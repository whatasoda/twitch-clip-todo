import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ChromeStorageAPI } from "../infrastructure/chrome/types";
import { createMockStorageAPI } from "../infrastructure/test-doubles";
import type { TwitchApiClient, TwitchAuthAPI } from "../infrastructure/twitch-api";
import type {
  TwitchApiResponse,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "../infrastructure/twitch-api/types";
import { createTwitchService } from "./twitch.service";

function createMockAuth(): { [K in keyof TwitchAuthAPI]: Mock } {
  return {
    startDeviceAuth: vi.fn(),
    pollForToken: vi.fn(),
    cancelPolling: vi.fn(),
    getPollingState: vi.fn(),
    awaitNextPoll: vi.fn(),
    refreshToken: vi.fn(),
    revokeToken: vi.fn(),
    getStoredToken: vi.fn(),
    storeToken: vi.fn(),
    clearToken: vi.fn(),
    isTokenExpired: vi.fn(),
  };
}

function createMockClient() {
  return {
    get: vi.fn(),
    isAuthenticated: vi.fn(),
    getRateLimitInfo: vi.fn(),
  } as unknown as TwitchApiClient & { get: Mock; isAuthenticated: Mock };
}

function makeResponse<T>(data: T[]): TwitchApiResponse<T> {
  return { data };
}

const sampleUser: TwitchUser = {
  id: "uid1",
  login: "teststreamer",
  display_name: "TestStreamer",
  type: "",
  broadcaster_type: "",
  description: "",
  profile_image_url: "https://example.com/avatar.jpg",
  offline_image_url: "",
  created_at: "2020-01-01T00:00:00Z",
};

const sampleVideo: TwitchVideo = {
  id: "v123",
  stream_id: "stream1",
  user_id: "uid1",
  user_login: "teststreamer",
  user_name: "TestStreamer",
  title: "Test VOD",
  description: "",
  created_at: "2024-06-15T10:00:00Z",
  published_at: "2024-06-15T10:00:00Z",
  url: "https://www.twitch.tv/videos/123",
  thumbnail_url: "",
  viewable: "public",
  view_count: 100,
  language: "en",
  type: "archive",
  duration: "2h30m0s",
};

const sampleStream: TwitchStream = {
  id: "stream1",
  user_id: "uid1",
  user_login: "teststreamer",
  user_name: "TestStreamer",
  game_id: "123",
  game_name: "Just Chatting",
  type: "live",
  title: "Test Stream",
  tags: [],
  viewer_count: 100,
  started_at: "2024-06-15T10:00:00Z",
  language: "en",
  thumbnail_url: "",
  is_mature: false,
};

describe("createTwitchService", () => {
  let auth: ReturnType<typeof createMockAuth>;
  let client: ReturnType<typeof createMockClient>;
  let storage: ChromeStorageAPI;
  let service: ReturnType<typeof createTwitchService>;

  beforeEach(() => {
    auth = createMockAuth();
    client = createMockClient();
    storage = createMockStorageAPI();
    service = createTwitchService({ auth, client, storage });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication passthrough", () => {
    it("isAuthenticated delegates to client", async () => {
      client.isAuthenticated.mockResolvedValue(true);
      expect(await service.isAuthenticated()).toBe(true);
    });

    it("startDeviceAuth delegates to auth", async () => {
      const dc = { device_code: "dc1" };
      auth.startDeviceAuth.mockResolvedValue(dc);
      expect(await service.startDeviceAuth()).toBe(dc);
    });

    it("pollForToken delegates to auth", async () => {
      const token = { access_token: "at1" };
      auth.pollForToken.mockResolvedValue(token);
      const deviceInfo = {
        userCode: "UC123",
        verificationUri: "https://id.twitch.tv/activate",
        expiresIn: 1800,
      };
      expect(await service.pollForToken("dc1", 5, deviceInfo)).toBe(token);
    });

    it("getAuthProgress delegates to auth.getPollingState", () => {
      const pollingState = {
        userCode: "UC123",
        verificationUri: "https://id.twitch.tv/activate",
        expiresAt: Date.now() + 1800000,
      };
      auth.getPollingState.mockReturnValue(pollingState);
      expect(service.getAuthProgress()).toBe(pollingState);
    });

    it("getAuthProgress returns null when not polling", () => {
      auth.getPollingState.mockReturnValue(null);
      expect(service.getAuthProgress()).toBeNull();
    });

    it("awaitNextPoll delegates to auth.awaitNextPoll", async () => {
      auth.awaitNextPoll.mockResolvedValue(undefined);
      await service.awaitNextPoll();
      expect(auth.awaitNextPoll).toHaveBeenCalled();
    });

    it("cancelAuth calls auth.cancelPolling", () => {
      service.cancelAuth();
      expect(auth.cancelPolling).toHaveBeenCalled();
    });

    it("logout revokes and clears token", async () => {
      const token = { access_token: "at1" };
      auth.getStoredToken.mockResolvedValue(token);
      auth.revokeToken.mockResolvedValue(undefined);
      auth.clearToken.mockResolvedValue(undefined);

      await service.logout();
      expect(auth.revokeToken).toHaveBeenCalledWith("at1");
      expect(auth.clearToken).toHaveBeenCalled();
    });
  });

  describe("getStreamerInfo", () => {
    it("returns mapped streamer info", async () => {
      client.get.mockResolvedValue(makeResponse([sampleUser]));

      const result = await service.getStreamerInfo("TestStreamer");
      expect(result).toEqual({
        id: "uid1",
        login: "teststreamer",
        displayName: "TestStreamer",
        profileImageUrl: "https://example.com/avatar.jpg",
      });
    });

    it("uses memory cache on second call", async () => {
      client.get.mockResolvedValue(makeResponse([sampleUser]));

      await service.getStreamerInfo("TestStreamer");
      await service.getStreamerInfo("TestStreamer");

      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it("normalizes login to lowercase", async () => {
      client.get.mockResolvedValue(makeResponse([sampleUser]));

      await service.getStreamerInfo("TestStreamer");

      expect(client.get).toHaveBeenCalledWith("/users", { login: "teststreamer" });
    });

    it("returns null on API error", async () => {
      client.get.mockRejectedValue(new Error("API error"));

      const result = await service.getStreamerInfo("test");
      expect(result).toBeNull();
    });

    it("returns null when user not found", async () => {
      client.get.mockResolvedValue(makeResponse([]));

      const result = await service.getStreamerInfo("nobody");
      expect(result).toBeNull();
    });
  });

  describe("getVodMetadata", () => {
    it("returns mapped vod metadata", async () => {
      client.get.mockResolvedValue(makeResponse([sampleVideo]));

      const result = await service.getVodMetadata("v123");
      expect(result).toBeTruthy();
      expect(result?.vodId).toBe("v123");
      expect(result?.durationSeconds).toBe(9000); // 2h30m
    });

    it("returns null when not found", async () => {
      client.get.mockResolvedValue(makeResponse([]));

      const result = await service.getVodMetadata("v999");
      expect(result).toBeNull();
    });

    it("returns null on API error", async () => {
      client.get.mockRejectedValue(new Error("API error"));

      const result = await service.getVodMetadata("v123");
      expect(result).toBeNull();
    });
  });

  describe("getCurrentStream", () => {
    it("returns mapped stream info", async () => {
      client.get.mockResolvedValue(makeResponse([sampleStream]));

      const result = await service.getCurrentStream("teststreamer");
      expect(result).toBeTruthy();
      expect(result?.streamId).toBe("stream1");
    });

    it("returns null when offline", async () => {
      client.get.mockResolvedValue(makeResponse([]));

      const result = await service.getCurrentStream("offlineuser");
      expect(result).toBeNull();
    });

    it("returns null on API error", async () => {
      client.get.mockRejectedValue(new Error("API error"));

      const result = await service.getCurrentStream("test");
      expect(result).toBeNull();
    });
  });

  describe("getCurrentStreamCached", () => {
    it("fetches from API on full cache miss", async () => {
      client.get.mockResolvedValue(makeResponse([sampleStream]));

      const result = await service.getCurrentStreamCached("teststreamer");
      expect(result?.streamId).toBe("stream1");
      expect(client.get).toHaveBeenCalled();
    });

    it("returns from memory cache on second call", async () => {
      client.get.mockResolvedValue(makeResponse([sampleStream]));

      await service.getCurrentStreamCached("teststreamer");
      client.get.mockClear();

      const result = await service.getCurrentStreamCached("teststreamer");
      expect(result?.streamId).toBe("stream1");
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  describe("invalidateStreamCache", () => {
    it("clears memory and persistent cache", async () => {
      // Populate cache
      client.get.mockResolvedValue(makeResponse([sampleStream]));
      await service.getCurrentStreamCached("teststreamer");
      client.get.mockClear();

      // Invalidate
      await service.invalidateStreamCache("teststreamer");

      // Should fetch again
      client.get.mockResolvedValue(makeResponse([sampleStream]));
      await service.getCurrentStreamCached("teststreamer");
      expect(client.get).toHaveBeenCalled();
    });
  });

  describe("getRecentVodsByUserId", () => {
    it("returns mapped vods", async () => {
      client.get.mockResolvedValue(makeResponse([sampleVideo]));

      const result = await service.getRecentVodsByUserId("uid1");
      expect(result).toHaveLength(1);
      expect(result[0]?.vodId).toBe("v123");
    });

    it("uses memory cache", async () => {
      client.get.mockResolvedValue(makeResponse([sampleVideo]));

      await service.getRecentVodsByUserId("uid1");
      client.get.mockClear();

      const result = await service.getRecentVodsByUserId("uid1");
      expect(result).toHaveLength(1);
      expect(client.get).not.toHaveBeenCalled();
    });

    it("returns empty on API error", async () => {
      client.get.mockRejectedValue(new Error("API error"));

      const result = await service.getRecentVodsByUserId("uid1");
      expect(result).toEqual([]);
    });
  });

  describe("findVodByStreamId", () => {
    it("finds matching vod", async () => {
      client.get.mockResolvedValue(makeResponse([sampleVideo]));

      const result = await service.findVodByStreamId("uid1", "stream1");
      expect(result).toBeTruthy();
      expect(result?.streamId).toBe("stream1");
    });

    it("returns null when no match", async () => {
      client.get.mockResolvedValue(makeResponse([sampleVideo]));

      const result = await service.findVodByStreamId("uid1", "nonexistent");
      expect(result).toBeNull();
    });
  });
});
