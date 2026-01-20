import { beforeEach, describe, expect, it } from "vitest";
import { createMockStorageAPI } from "../infrastructure/test-doubles";
import { createRecordService, type RecordService } from "./record.service";

describe("RecordService", () => {
  let service: RecordService;

  beforeEach(() => {
    service = createRecordService({ storage: createMockStorageAPI() });
  });

  it("creates and retrieves a record", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const all = await service.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe(record.id);
  });

  it("gets record by id", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const found = await service.getById(record.id);
    expect(found?.id).toBe(record.id);
  });

  it("returns null for non-existent record", async () => {
    const found = await service.getById("non-existent");
    expect(found).toBeNull();
  });

  it("gets records by streamer id", async () => {
    await service.create({
      streamerId: "test1",
      streamerName: "Test 1",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    await service.create({
      streamerId: "test2",
      streamerName: "Test 2",
      timestampSeconds: 200,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    await service.create({
      streamerId: "test1",
      streamerName: "Test 1",
      timestampSeconds: 300,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const records = await service.getByStreamerId("test1");
    expect(records).toHaveLength(2);
  });

  it("updates memo", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const updated = await service.updateMemo(record.id, "New memo");
    expect(updated.memo).toBe("New memo");

    const found = await service.getById(record.id);
    expect(found?.memo).toBe("New memo");
  });

  it("marks as completed", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const completed = await service.markCompleted(record.id);
    expect(completed.completedAt).not.toBeNull();

    const found = await service.getById(record.id);
    expect(found?.completedAt).not.toBeNull();
  });

  it("links to VOD", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    const linked = await service.linkToVod(record.id, "vod123", 500);
    expect(linked.vodId).toBe("vod123");
    expect(linked.timestampSeconds).toBe(500);
    expect(linked.sourceType).toBe("vod");
  });

  it("deletes a record", async () => {
    const record = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    await service.delete(record.id);
    const all = await service.getAll();
    expect(all).toHaveLength(0);
  });

  it("gets pending count", async () => {
    await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    const record2 = await service.create({
      streamerId: "test",
      streamerName: "Test",
      timestampSeconds: 200,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    await service.markCompleted(record2.id);

    const count = await service.getPendingCount("test");
    expect(count).toBe(1);
  });

  it("throws when updating non-existent record", async () => {
    await expect(service.updateMemo("non-existent", "test")).rejects.toThrow("Record not found");
  });
});
