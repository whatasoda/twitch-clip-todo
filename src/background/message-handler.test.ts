import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ChromeStorageAPI } from "../infrastructure/chrome/types";
import { createMockStorageAPI } from "../infrastructure/test-doubles";
import type {
  LinkingService,
  RecordService,
  TwitchService,
  VodDiscoveryService,
} from "../services";
import { STORAGE_KEYS } from "../shared/constants";
import { handleMessage, type MessageHandlerDeps } from "./message-handler";

// Mock chrome.action for DISMISS_CLEANUP_NOTIFICATION
vi.stubGlobal("chrome", {
  action: { setBadgeText: vi.fn() },
});

function createMockRecordService(): { [K in keyof RecordService]: Mock } {
  return {
    create: vi.fn(),
    getAll: vi.fn(),
    getByStreamerId: vi.fn(),
    getById: vi.fn(),
    updateMemo: vi.fn(),
    markCompleted: vi.fn(),
    linkToVod: vi.fn(),
    delete: vi.fn(),
    deleteByStreamerId: vi.fn(),
    deleteCompleted: vi.fn(),
    getPendingCount: vi.fn(),
  };
}

function createMockLinkingService(): { [K in keyof LinkingService]: Mock } {
  return {
    linkVod: vi.fn(),
  };
}

function createMockTwitchService(): { [K in keyof TwitchService]: Mock } {
  return {
    isAuthenticated: vi.fn(),
    startDeviceAuth: vi.fn(),
    pollForToken: vi.fn(),
    cancelAuth: vi.fn(),
    logout: vi.fn(),
    getStreamerInfo: vi.fn(),
    getVodMetadata: vi.fn(),
    getCurrentStream: vi.fn(),
    getCurrentStreamCached: vi.fn(),
    invalidateStreamCache: vi.fn(),
    getRecentVodsByUserId: vi.fn(),
    findVodByStreamId: vi.fn(),
  };
}

function createMockVodDiscoveryService(): { [K in keyof VodDiscoveryService]: Mock } {
  return {
    initialize: vi.fn(),
    runDiscovery: vi.fn(),
    discoverAndLinkForStreamer: vi.fn(),
  };
}

// Helper to send arbitrary messages (bypasses TS type checking for invalid payload tests)
function send(message: unknown, deps: MessageHandlerDeps) {
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  return handleMessage(message as any, deps);
}

describe("handleMessage", () => {
  let recordService: ReturnType<typeof createMockRecordService>;
  let linkingService: ReturnType<typeof createMockLinkingService>;
  let twitchService: ReturnType<typeof createMockTwitchService>;
  let vodDiscoveryService: ReturnType<typeof createMockVodDiscoveryService>;
  let storage: ChromeStorageAPI;
  let deps: MessageHandlerDeps;

  beforeEach(() => {
    recordService = createMockRecordService();
    linkingService = createMockLinkingService();
    twitchService = createMockTwitchService();
    vodDiscoveryService = createMockVodDiscoveryService();
    storage = createMockStorageAPI();
    deps = {
      recordService,
      linkingService,
      twitchService,
      vodDiscoveryService,
      storage,
    };
  });

  describe("validation", () => {
    it("returns error for invalid CREATE_RECORD payload", async () => {
      const result = await send({ type: "CREATE_RECORD", payload: { bad: true } }, deps);
      expect(result).toEqual(expect.objectContaining({ success: false }));
      expect("error" in result && result.error).toContain("Invalid payload");
    });

    it("returns error for invalid UPDATE_MEMO payload", async () => {
      const result = await send({ type: "UPDATE_MEMO", payload: { id: 123 } }, deps);
      expect(result.success).toBe(false);
    });

    it("returns error for invalid LINK_VOD payload", async () => {
      const result = await send({ type: "LINK_VOD", payload: {} }, deps);
      expect(result.success).toBe(false);
    });

    it("returns error for unknown message type", async () => {
      const result = await send({ type: "UNKNOWN_TYPE" }, deps);
      expect(result).toEqual({ success: false, error: "Unknown message type" });
    });
  });

  describe("record operations", () => {
    it("CREATE_RECORD calls recordService.create", async () => {
      const payload = {
        streamerId: "s1",
        streamerName: "S1",
        timestampSeconds: 100,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: "b1",
      };
      const record = { id: "r1", ...payload };
      recordService.create.mockResolvedValue(record);

      const result = await handleMessage({ type: "CREATE_RECORD", payload }, deps);
      expect(result).toEqual({ success: true, data: record });
      expect(recordService.create).toHaveBeenCalledWith(payload);
    });

    it("GET_RECORDS without streamerId returns all records", async () => {
      const records = [{ id: "r1" }];
      recordService.getAll.mockResolvedValue(records);

      const result = await handleMessage({ type: "GET_RECORDS" }, deps);
      expect(result).toEqual({ success: true, data: records });
      expect(recordService.getAll).toHaveBeenCalled();
    });

    it("GET_RECORDS with streamerId filters", async () => {
      const records = [{ id: "r1" }];
      recordService.getByStreamerId.mockResolvedValue(records);

      const result = await handleMessage(
        { type: "GET_RECORDS", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: records });
      expect(recordService.getByStreamerId).toHaveBeenCalledWith("s1");
    });

    it("UPDATE_MEMO calls recordService.updateMemo", async () => {
      const updated = { id: "r1", memo: "test" };
      recordService.updateMemo.mockResolvedValue(updated);

      const result = await handleMessage(
        { type: "UPDATE_MEMO", payload: { id: "r1", memo: "test" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: updated });
      expect(recordService.updateMemo).toHaveBeenCalledWith("r1", "test");
    });

    it("MARK_COMPLETED calls recordService.markCompleted", async () => {
      const record = { id: "r1" };
      recordService.markCompleted.mockResolvedValue(record);

      const result = await handleMessage({ type: "MARK_COMPLETED", payload: { id: "r1" } }, deps);
      expect(result).toEqual({ success: true, data: record });
    });

    it("DELETE_RECORD calls recordService.delete", async () => {
      recordService.delete.mockResolvedValue(undefined);

      const result = await handleMessage({ type: "DELETE_RECORD", payload: { id: "r1" } }, deps);
      expect(result).toEqual({ success: true, data: null });
      expect(recordService.delete).toHaveBeenCalledWith("r1");
    });

    it("DELETE_RECORDS_BY_STREAMER calls recordService.deleteByStreamerId", async () => {
      recordService.deleteByStreamerId.mockResolvedValue(3);

      const result = await handleMessage(
        { type: "DELETE_RECORDS_BY_STREAMER", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: 3 });
    });

    it("DELETE_COMPLETED_RECORDS calls recordService.deleteCompleted", async () => {
      recordService.deleteCompleted.mockResolvedValue(5);

      const result = await handleMessage({ type: "DELETE_COMPLETED_RECORDS" }, deps);
      expect(result).toEqual({ success: true, data: 5 });
    });

    it("GET_PENDING_COUNT returns count", async () => {
      recordService.getPendingCount.mockResolvedValue(7);

      const result = await handleMessage(
        { type: "GET_PENDING_COUNT", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: 7 });
    });
  });

  describe("twitch API (twitchService = null)", () => {
    beforeEach(() => {
      deps.twitchService = null;
    });

    it("TWITCH_GET_AUTH_STATUS returns false", async () => {
      const result = await send({ type: "TWITCH_GET_AUTH_STATUS" }, deps);
      expect(result).toEqual({ success: true, data: { isAuthenticated: false } });
    });

    it("TWITCH_START_DEVICE_AUTH returns error", async () => {
      const result = await send({ type: "TWITCH_START_DEVICE_AUTH" }, deps);
      expect(result.success).toBe(false);
    });

    it("TWITCH_GET_STREAMER_INFO returns null (success)", async () => {
      const result = await handleMessage(
        { type: "TWITCH_GET_STREAMER_INFO", payload: { login: "test" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: null });
    });

    it("GET_RECENT_VODS returns empty array", async () => {
      const result = await handleMessage(
        { type: "GET_RECENT_VODS", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe("twitch API (twitchService exists)", () => {
    it("TWITCH_GET_AUTH_STATUS calls service", async () => {
      twitchService.isAuthenticated.mockResolvedValue(true);

      const result = await send({ type: "TWITCH_GET_AUTH_STATUS" }, deps);
      expect(result).toEqual({ success: true, data: { isAuthenticated: true } });
    });

    it("TWITCH_START_DEVICE_AUTH returns device code", async () => {
      const deviceCode = { device_code: "dc1", user_code: "UC1" };
      twitchService.startDeviceAuth.mockResolvedValue(deviceCode);

      const result = await send({ type: "TWITCH_START_DEVICE_AUTH" }, deps);
      expect(result).toEqual({ success: true, data: deviceCode });
    });

    it("TWITCH_POLL_TOKEN with valid payload", async () => {
      const token = { access_token: "at1" };
      twitchService.pollForToken.mockResolvedValue(token);

      const result = await handleMessage(
        { type: "TWITCH_POLL_TOKEN", payload: { deviceCode: "dc1", interval: 5 } },
        deps,
      );
      expect(result).toEqual({ success: true, data: token });
      expect(twitchService.pollForToken).toHaveBeenCalledWith("dc1", 5);
    });

    it("TWITCH_CANCEL_AUTH calls cancelAuth", async () => {
      const result = await send({ type: "TWITCH_CANCEL_AUTH" }, deps);
      expect(result).toEqual({ success: true, data: null });
      expect(twitchService.cancelAuth).toHaveBeenCalled();
    });

    it("TWITCH_LOGOUT calls logout", async () => {
      twitchService.logout.mockResolvedValue(undefined);

      const result = await send({ type: "TWITCH_LOGOUT" }, deps);
      expect(result).toEqual({ success: true, data: null });
      expect(twitchService.logout).toHaveBeenCalled();
    });

    it("TWITCH_GET_STREAMER_INFO returns info", async () => {
      const info = { id: "1", login: "test" };
      twitchService.getStreamerInfo.mockResolvedValue(info);

      const result = await handleMessage(
        { type: "TWITCH_GET_STREAMER_INFO", payload: { login: "test" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: info });
    });

    it("TWITCH_GET_VOD_METADATA returns metadata", async () => {
      const metadata = { vodId: "v1" };
      twitchService.getVodMetadata.mockResolvedValue(metadata);

      const result = await handleMessage(
        { type: "TWITCH_GET_VOD_METADATA", payload: { vodId: "v1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: metadata });
    });

    it("TWITCH_GET_CURRENT_STREAM returns stream", async () => {
      const stream = { streamId: "s1" };
      twitchService.getCurrentStream.mockResolvedValue(stream);

      const result = await handleMessage(
        { type: "TWITCH_GET_CURRENT_STREAM", payload: { login: "test" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: stream });
    });

    it("TWITCH_GET_CURRENT_STREAM_CACHED returns cached", async () => {
      const stream = { streamId: "s1" };
      twitchService.getCurrentStreamCached.mockResolvedValue(stream);

      const result = await handleMessage(
        { type: "TWITCH_GET_CURRENT_STREAM_CACHED", payload: { login: "test" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: stream });
    });
  });

  describe("VOD discovery", () => {
    it("RUN_VOD_DISCOVERY calls runDiscovery", async () => {
      const results = [{ streamerId: "s1", linkedCount: 2 }];
      vodDiscoveryService.runDiscovery.mockResolvedValue(results);

      const result = await send({ type: "RUN_VOD_DISCOVERY" }, deps);
      expect(result).toEqual({ success: true, data: results });
    });

    it("DISCOVER_VOD_FOR_STREAMER calls discoverAndLinkForStreamer", async () => {
      const discResult = { streamerId: "s1", linkedCount: 1 };
      vodDiscoveryService.discoverAndLinkForStreamer.mockResolvedValue(discResult);

      const result = await handleMessage(
        { type: "DISCOVER_VOD_FOR_STREAMER", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: discResult });
      expect(vodDiscoveryService.discoverAndLinkForStreamer).toHaveBeenCalledWith("s1");
    });

    it("LINK_VOD calls linkingService.linkVod", async () => {
      const records = [{ id: "r1" }];
      linkingService.linkVod.mockResolvedValue(records);

      const payload = {
        vodId: "v1",
        streamerId: "s1",
        streamId: "st1",
        startedAt: "2024-01-01T00:00:00Z",
        durationSeconds: 3600,
      };
      const result = await handleMessage({ type: "LINK_VOD", payload }, deps);
      expect(result).toEqual({ success: true, data: records });
      expect(linkingService.linkVod).toHaveBeenCalledWith(payload);
    });

    it("GET_RECENT_VODS fetches streamer then vods", async () => {
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([{ vodId: "v1" }]);

      const result = await handleMessage(
        { type: "GET_RECENT_VODS", payload: { streamerId: "s1" } },
        deps,
      );
      expect(result).toEqual({ success: true, data: [{ vodId: "v1" }] });
      expect(twitchService.getStreamerInfo).toHaveBeenCalledWith("s1");
      expect(twitchService.getRecentVodsByUserId).toHaveBeenCalledWith("uid1");
    });
  });

  describe("onboarding", () => {
    it("GET_ONBOARDING_STATE returns default when empty", async () => {
      const result = await send({ type: "GET_ONBOARDING_STATE" }, deps);
      expect(result).toEqual({
        success: true,
        data: { hasSeenTwitchToast: false, hasSeenFirstRecordHint: false },
      });
    });

    it("GET_ONBOARDING_STATE returns stored state", async () => {
      await storage.set(STORAGE_KEYS.ONBOARDING, {
        hasSeenTwitchToast: true,
        hasSeenFirstRecordHint: true,
      });

      const result = await send({ type: "GET_ONBOARDING_STATE" }, deps);
      expect(result).toEqual({
        success: true,
        data: { hasSeenTwitchToast: true, hasSeenFirstRecordHint: true },
      });
    });

    it("UPDATE_ONBOARDING_STATE merges with existing", async () => {
      await storage.set(STORAGE_KEYS.ONBOARDING, {
        hasSeenTwitchToast: false,
        hasSeenFirstRecordHint: false,
      });

      const result = await handleMessage(
        { type: "UPDATE_ONBOARDING_STATE", payload: { hasSeenTwitchToast: true } },
        deps,
      );
      expect(result).toEqual({
        success: true,
        data: { hasSeenTwitchToast: true, hasSeenFirstRecordHint: false },
      });
    });
  });

  describe("cleanup notification", () => {
    it("GET_CLEANUP_NOTIFICATION returns stored value", async () => {
      const notification = { count: 5, timestamp: "2024-01-01T00:00:00Z" };
      await storage.set(STORAGE_KEYS.CLEANUP_NOTIFICATION, notification);

      const result = await send({ type: "GET_CLEANUP_NOTIFICATION" }, deps);
      expect(result).toEqual({ success: true, data: notification });
    });

    it("DISMISS_CLEANUP_NOTIFICATION removes and clears badge", async () => {
      await storage.set(STORAGE_KEYS.CLEANUP_NOTIFICATION, { count: 3 });

      const result = await send({ type: "DISMISS_CLEANUP_NOTIFICATION" }, deps);
      expect(result).toEqual({ success: true, data: null });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    });
  });

  describe("error handling", () => {
    it("service error returns { success: false, error: message }", async () => {
      recordService.create.mockRejectedValue(new Error("DB write failed"));

      const result = await handleMessage(
        {
          type: "CREATE_RECORD",
          payload: {
            streamerId: "s1",
            streamerName: "S1",
            timestampSeconds: 100,
            sourceType: "live",
            vodId: null,
            broadcastId: null,
          },
        },
        deps,
      );
      expect(result).toEqual({ success: false, error: "DB write failed" });
    });

    it("non-Error throw returns 'Unknown error'", async () => {
      recordService.create.mockRejectedValue("string error");

      const result = await handleMessage(
        {
          type: "CREATE_RECORD",
          payload: {
            streamerId: "s1",
            streamerName: "S1",
            timestampSeconds: 100,
            sourceType: "live",
            vodId: null,
            broadcastId: null,
          },
        },
        deps,
      );
      expect(result).toEqual({ success: false, error: "Unknown error" });
    });
  });
});
