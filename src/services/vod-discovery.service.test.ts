import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Record } from "../core/record";
import type { ChromeAlarmsAPI } from "../infrastructure/chrome/types";
import type { LinkingService } from "./linking.service";
import type { RecordService } from "./record.service";
import type { TwitchService } from "./twitch.service";
import { createVodDiscoveryService } from "./vod-discovery.service";

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

function createMockTwitchService(): Pick<
  { [K in keyof TwitchService]: Mock },
  "getStreamerInfo" | "getRecentVodsByUserId"
> &
  TwitchService {
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
  } as unknown as Pick<
    { [K in keyof TwitchService]: Mock },
    "getStreamerInfo" | "getRecentVodsByUserId"
  > &
    TwitchService;
}

function createMockAlarms(): ChromeAlarmsAPI {
  return {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  };
}

function makeRecord(overrides?: Partial<Record>): Record {
  const now = new Date().toISOString();
  return {
    id: "r1",
    streamerId: "streamer1",
    streamerName: "Streamer1",
    timestampSeconds: 100,
    sourceType: "live",
    vodId: null,
    broadcastId: "broadcast1",
    completedAt: null,
    memo: "",
    recordedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("createVodDiscoveryService", () => {
  let recordService: ReturnType<typeof createMockRecordService>;
  let linkingService: ReturnType<typeof createMockLinkingService>;
  let twitchService: ReturnType<typeof createMockTwitchService>;
  let alarms: ChromeAlarmsAPI;
  let service: ReturnType<typeof createVodDiscoveryService>;

  beforeEach(() => {
    recordService = createMockRecordService();
    linkingService = createMockLinkingService();
    twitchService = createMockTwitchService();
    alarms = createMockAlarms();
    service = createVodDiscoveryService({
      recordService,
      linkingService,
      twitchService,
      alarms,
    });
  });

  describe("initialize", () => {
    it("creates periodic alarm", () => {
      service.initialize();
      expect(alarms.create).toHaveBeenCalledWith("vod-discovery", {
        periodInMinutes: expect.any(Number),
      });
    });

    it("registers alarm listener", () => {
      service.initialize();
      expect(alarms.onAlarm.addListener).toHaveBeenCalled();
    });
  });

  describe("runDiscovery", () => {
    it("returns empty when no unlinked records", async () => {
      recordService.getAll.mockResolvedValue([]);

      const results = await service.runDiscovery();
      expect(results).toEqual([]);
    });

    it("discovers for each unique streamer", async () => {
      recordService.getAll.mockResolvedValue([
        makeRecord({ id: "r1", streamerId: "s1" }),
        makeRecord({ id: "r2", streamerId: "s2" }),
      ]);
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([]);

      const results = await service.runDiscovery();
      expect(results).toHaveLength(2);
    });

    it("filters out already-linked records", async () => {
      recordService.getAll.mockResolvedValue([
        makeRecord({ id: "r1", vodId: "v1" }), // already linked
        makeRecord({ id: "r2", vodId: null }), // unlinked
      ]);
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "streamer1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([]);

      const results = await service.runDiscovery();
      expect(results).toHaveLength(1); // Only one streamer with unlinked records
    });

    it("filters out records without broadcastId", async () => {
      recordService.getAll.mockResolvedValue([
        makeRecord({ id: "r1", broadcastId: null }), // no broadcast ID
      ]);

      const results = await service.runDiscovery();
      expect(results).toEqual([]); // Filtered out
    });
  });

  describe("discoverAndLinkForStreamer", () => {
    it("links matching VODs to records", async () => {
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([
        {
          vodId: "v1",
          streamerId: "s1",
          streamerName: "S1",
          title: "VOD",
          startedAt: "2024-01-01T00:00:00Z",
          durationSeconds: 3600,
          streamId: "stream1",
        },
      ]);
      linkingService.linkVod.mockResolvedValue([{ id: "r1" }]);

      const result = await service.discoverAndLinkForStreamer("s1");
      expect(result.linkedCount).toBe(1);
      expect(linkingService.linkVod).toHaveBeenCalled();
    });

    it("returns linkedCount", async () => {
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([
        {
          vodId: "v1",
          streamerId: "s1",
          streamerName: "S1",
          title: "VOD",
          startedAt: "2024-01-01T00:00:00Z",
          durationSeconds: 3600,
          streamId: "stream1",
        },
      ]);
      linkingService.linkVod.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);

      const result = await service.discoverAndLinkForStreamer("s1");
      expect(result.linkedCount).toBe(2);
    });

    it("skips VODs without streamId", async () => {
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([
        {
          vodId: "v1",
          streamerId: "s1",
          streamerName: "S1",
          title: "VOD",
          startedAt: "2024-01-01T00:00:00Z",
          durationSeconds: 3600,
          streamId: null,
        },
      ]);

      const result = await service.discoverAndLinkForStreamer("s1");
      expect(result.linkedCount).toBe(0);
      expect(linkingService.linkVod).not.toHaveBeenCalled();
    });

    it("returns error when streamer not found", async () => {
      twitchService.getStreamerInfo.mockResolvedValue(null);

      const result = await service.discoverAndLinkForStreamer("unknown");
      expect(result.linkedCount).toBe(0);
      expect(result.error).toBe("Streamer not found");
    });

    it("returns error when no VODs available", async () => {
      twitchService.getStreamerInfo.mockResolvedValue({ id: "uid1", login: "s1" });
      twitchService.getRecentVodsByUserId.mockResolvedValue([]);

      const result = await service.discoverAndLinkForStreamer("s1");
      expect(result.linkedCount).toBe(0);
      expect(result.error).toBe("No VODs available");
    });

    it("catches and returns error on exception", async () => {
      twitchService.getStreamerInfo.mockRejectedValue(new Error("Network error"));

      const result = await service.discoverAndLinkForStreamer("s1");
      expect(result.linkedCount).toBe(0);
      expect(result.error).toBe("Network error");
    });
  });
});
