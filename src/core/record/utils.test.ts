import { describe, expect, it } from "vitest";
import {
  createRecord,
  groupRecordsByStreamer,
  isRecordCompleted,
  isRecordLinked,
  sortRecordsByDate,
} from "./utils";

describe("createRecord", () => {
  it("creates a record with all required fields", () => {
    const record = createRecord({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: 3600,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });

    expect(record.id).toBeDefined();
    expect(record.streamerId).toBe("streamer1");
    expect(record.memo).toBe("");
    expect(record.completedAt).toBeNull();
  });
});

describe("isRecordLinked", () => {
  it("returns true when vodId is present", () => {
    const record = createRecord({
      streamerId: "s1",
      streamerName: "S1",
      timestampSeconds: 100,
      sourceType: "vod",
      vodId: "12345",
      broadcastId: null,
    });
    expect(isRecordLinked(record)).toBe(true);
  });

  it("returns false when vodId is null", () => {
    const record = createRecord({
      streamerId: "s1",
      streamerName: "S1",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    expect(isRecordLinked(record)).toBe(false);
  });
});

describe("isRecordCompleted", () => {
  it("returns false for new records", () => {
    const record = createRecord({
      streamerId: "s1",
      streamerName: "S1",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    expect(isRecordCompleted(record)).toBe(false);
  });

  it("returns true when completedAt is set", () => {
    const record = createRecord({
      streamerId: "s1",
      streamerName: "S1",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    record.completedAt = new Date().toISOString();
    expect(isRecordCompleted(record)).toBe(true);
  });
});

describe("groupRecordsByStreamer", () => {
  it("groups records by streamerId", () => {
    const records = [
      createRecord({
        streamerId: "a",
        streamerName: "A",
        timestampSeconds: 1,
        sourceType: "live",
        vodId: null,
        broadcastId: null,
      }),
      createRecord({
        streamerId: "b",
        streamerName: "B",
        timestampSeconds: 2,
        sourceType: "live",
        vodId: null,
        broadcastId: null,
      }),
      createRecord({
        streamerId: "a",
        streamerName: "A",
        timestampSeconds: 3,
        sourceType: "live",
        vodId: null,
        broadcastId: null,
      }),
    ];

    const groups = groupRecordsByStreamer(records);
    expect(groups.get("a")?.length).toBe(2);
    expect(groups.get("b")?.length).toBe(1);
  });
});

describe("sortRecordsByDate", () => {
  it("sorts records by createdAt in descending order by default", () => {
    const now = Date.now();
    const records = [
      {
        ...createRecord({
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 1,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        createdAt: new Date(now - 1000).toISOString(),
      },
      {
        ...createRecord({
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 2,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        createdAt: new Date(now + 1000).toISOString(),
      },
      {
        ...createRecord({
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 3,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        createdAt: new Date(now).toISOString(),
      },
    ];

    const sorted = sortRecordsByDate(records);
    expect(sorted[0]?.timestampSeconds).toBe(2);
    expect(sorted[1]?.timestampSeconds).toBe(3);
    expect(sorted[2]?.timestampSeconds).toBe(1);
  });

  it("sorts records in ascending order when specified", () => {
    const now = Date.now();
    const records = [
      {
        ...createRecord({
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 1,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        createdAt: new Date(now - 1000).toISOString(),
      },
      {
        ...createRecord({
          streamerId: "s1",
          streamerName: "S1",
          timestampSeconds: 2,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        createdAt: new Date(now + 1000).toISOString(),
      },
    ];

    const sorted = sortRecordsByDate(records, "asc");
    expect(sorted[0]?.timestampSeconds).toBe(1);
    expect(sorted[1]?.timestampSeconds).toBe(2);
  });
});
