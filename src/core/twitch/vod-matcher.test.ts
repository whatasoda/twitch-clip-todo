import { describe, expect, it } from "vitest";
import { createRecord } from "../record";
import { calculateVodOffset, linkRecordsToVod, matchRecordToVod } from "./vod-matcher";

describe("matchRecordToVod", () => {
  const vod = {
    vodId: "123",
    streamerId: "streamer1",
    startedAt: new Date("2024-01-01T10:00:00Z"),
    durationSeconds: 7200, // 2 hours
  };

  it("matches record within VOD timeframe", () => {
    const record = {
      ...createRecord({
        streamerId: "streamer1",
        streamerName: "Streamer 1",
        timestampSeconds: 3600,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T11:00:00Z",
    };

    expect(matchRecordToVod(record, vod)).toBe(true);
  });

  it("does not match record outside VOD timeframe", () => {
    const record = {
      ...createRecord({
        streamerId: "streamer1",
        streamerName: "Streamer 1",
        timestampSeconds: 3600,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T15:00:00Z",
    };

    expect(matchRecordToVod(record, vod)).toBe(false);
  });

  it("does not match record from different streamer", () => {
    const record = {
      ...createRecord({
        streamerId: "streamer2",
        streamerName: "Streamer 2",
        timestampSeconds: 3600,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T11:00:00Z",
    };

    expect(matchRecordToVod(record, vod)).toBe(false);
  });

  it("does not match VOD record", () => {
    const record = {
      ...createRecord({
        streamerId: "streamer1",
        streamerName: "Streamer 1",
        timestampSeconds: 3600,
        sourceType: "vod" as const,
        vodId: "456",
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T11:00:00Z",
    };

    expect(matchRecordToVod(record, vod)).toBe(false);
  });
});

describe("calculateVodOffset", () => {
  it("calculates correct offset", () => {
    const record = {
      ...createRecord({
        streamerId: "s1",
        streamerName: "S1",
        timestampSeconds: 0,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T11:30:00Z",
    };

    const offset = calculateVodOffset(record, new Date("2024-01-01T10:00:00Z"));
    expect(offset).toBe(5400); // 1.5 hours = 5400 seconds
  });

  it("returns 0 for records before VOD start", () => {
    const record = {
      ...createRecord({
        streamerId: "s1",
        streamerName: "S1",
        timestampSeconds: 0,
        sourceType: "live" as const,
        vodId: null,
        broadcastId: null,
      }),
      recordedAt: "2024-01-01T09:00:00Z",
    };

    const offset = calculateVodOffset(record, new Date("2024-01-01T10:00:00Z"));
    expect(offset).toBe(0);
  });
});

describe("linkRecordsToVod", () => {
  const vod = {
    vodId: "123",
    streamerId: "streamer1",
    startedAt: new Date("2024-01-01T10:00:00Z"),
    durationSeconds: 7200,
  };

  it("links matching records to VOD", () => {
    const records = [
      {
        ...createRecord({
          streamerId: "streamer1",
          streamerName: "Streamer 1",
          timestampSeconds: 0,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        recordedAt: "2024-01-01T11:00:00Z",
      },
      {
        ...createRecord({
          streamerId: "streamer1",
          streamerName: "Streamer 1",
          timestampSeconds: 0,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        recordedAt: "2024-01-01T11:30:00Z",
      },
      {
        ...createRecord({
          streamerId: "streamer2",
          streamerName: "Streamer 2",
          timestampSeconds: 0,
          sourceType: "live" as const,
          vodId: null,
          broadcastId: null,
        }),
        recordedAt: "2024-01-01T11:00:00Z",
      },
    ];

    const linked = linkRecordsToVod(records, vod);
    expect(linked.length).toBe(2);
    expect(linked[0]?.vodOffset).toBe(3600); // 1 hour
    expect(linked[1]?.vodOffset).toBe(5400); // 1.5 hours
  });
});
