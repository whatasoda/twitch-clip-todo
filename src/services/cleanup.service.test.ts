import { describe, expect, it, vi } from "vitest";
import type { RecordStore } from "../core/record";
import { createMockStorageAPI } from "../infrastructure/test-doubles";
import { STORAGE_KEYS } from "../shared/constants";
import { createCleanupService } from "./cleanup.service";

describe("CleanupService", () => {
  it("removes records older than cleanup threshold", async () => {
    const storage = createMockStorageAPI();

    // Create old and new records
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 70); // 70 days ago

    const store: RecordStore = {
      version: 1,
      records: [
        {
          id: "old",
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 100,
          memo: "",
          sourceType: "live",
          vodId: null,
          broadcastId: null,
          recordedAt: oldDate.toISOString(),
          completedAt: null,
          createdAt: oldDate.toISOString(),
          updatedAt: oldDate.toISOString(),
        },
        {
          id: "new",
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 200,
          memo: "",
          sourceType: "live",
          vodId: null,
          broadcastId: null,
          recordedAt: new Date().toISOString(),
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await storage.set(STORAGE_KEYS.RECORDS, store);

    const alarms = {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    };

    const service = createCleanupService({ storage, alarms });
    const deleted = await service.runCleanup();

    expect(deleted).toBe(1);

    const updated = await storage.get<RecordStore>(STORAGE_KEYS.RECORDS);
    expect(updated?.records).toHaveLength(1);
    expect(updated?.records[0]?.id).toBe("new");
  });

  it("does not delete records within threshold", async () => {
    const storage = createMockStorageAPI();

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

    const store: RecordStore = {
      version: 1,
      records: [
        {
          id: "recent",
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 100,
          memo: "",
          sourceType: "live",
          vodId: null,
          broadcastId: null,
          recordedAt: recentDate.toISOString(),
          completedAt: null,
          createdAt: recentDate.toISOString(),
          updatedAt: recentDate.toISOString(),
        },
      ],
    };

    await storage.set(STORAGE_KEYS.RECORDS, store);

    const alarms = {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    };

    const service = createCleanupService({ storage, alarms });
    const deleted = await service.runCleanup();

    expect(deleted).toBe(0);

    const updated = await storage.get<RecordStore>(STORAGE_KEYS.RECORDS);
    expect(updated?.records).toHaveLength(1);
  });

  it("initializes with alarm", () => {
    const storage = createMockStorageAPI();
    const alarms = {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    };

    const service = createCleanupService({ storage, alarms });
    service.initialize();

    expect(alarms.create).toHaveBeenCalledWith("cleanup-old-records", { periodInMinutes: 1440 });
    expect(alarms.onAlarm.addListener).toHaveBeenCalled();
  });

  it("returns 0 when no store exists", async () => {
    const storage = createMockStorageAPI();
    const alarms = {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    };

    const service = createCleanupService({ storage, alarms });
    const deleted = await service.runCleanup();

    expect(deleted).toBe(0);
  });
});
