import { beforeEach, describe, expect, it } from "vitest";
import { createMockStorageAPI } from "../infrastructure/test-doubles";
import { createLinkingService, type LinkingService } from "./linking.service";
import { createRecordService, type RecordService } from "./record.service";

describe("LinkingService", () => {
  let recordService: RecordService;
  let linkingService: LinkingService;

  beforeEach(() => {
    recordService = createRecordService({ storage: createMockStorageAPI() });
    linkingService = createLinkingService({ recordService });
  });

  it("links matching records to VOD by stream_id", async () => {
    const vodStart = new Date("2024-01-01T10:00:00Z");
    const streamId = "broadcast123";

    // Create a live record with matching broadcastId
    const record1 = await recordService.create({
      streamerId: "streamer1",
      streamerName: "Streamer 1",
      timestampSeconds: 0,
      sourceType: "live",
      vodId: null,
      broadcastId: streamId,
    });

    // Manually update recordedAt to be within VOD timeframe (for offset calculation)
    const store = await recordService.getAll();
    const r = store.find((r) => r.id === record1.id);
    if (r) {
      r.recordedAt = "2024-01-01T11:00:00Z"; // 1 hour into the stream
    }

    // Link to VOD with matching stream_id
    const vodPayload = {
      vodId: "vod123",
      streamerId: "streamer1",
      streamId: streamId,
      startedAt: vodStart.toISOString(),
      durationSeconds: 7200, // 2 hours
    };

    const linked = await linkingService.linkVod(vodPayload);

    expect(linked).toHaveLength(1);
    expect(linked[0]?.vodId).toBe("vod123");
  });

  it("does not link records from different streamers", async () => {
    await recordService.create({
      streamerId: "other_streamer",
      streamerName: "Other Streamer",
      timestampSeconds: 0,
      sourceType: "live",
      vodId: null,
      broadcastId: "broadcast123",
    });

    const vodPayload = {
      vodId: "vod123",
      streamerId: "streamer1",
      streamId: "broadcast123", // Same stream_id but different streamer
      startedAt: new Date().toISOString(),
      durationSeconds: 7200,
    };

    const linked = await linkingService.linkVod(vodPayload);
    expect(linked).toHaveLength(0);
  });

  it("does not link already linked records", async () => {
    await recordService.create({
      streamerId: "streamer1",
      streamerName: "Streamer 1",
      timestampSeconds: 0,
      sourceType: "vod",
      vodId: "existing_vod",
      broadcastId: "broadcast123",
    });

    const vodPayload = {
      vodId: "new_vod",
      streamerId: "streamer1",
      streamId: "broadcast123",
      startedAt: new Date().toISOString(),
      durationSeconds: 7200,
    };

    const linked = await linkingService.linkVod(vodPayload);
    expect(linked).toHaveLength(0);
  });

  it("does not link records without broadcastId", async () => {
    await recordService.create({
      streamerId: "streamer1",
      streamerName: "Streamer 1",
      timestampSeconds: 0,
      sourceType: "live",
      vodId: null,
      broadcastId: null, // No broadcast ID
    });

    const vodPayload = {
      vodId: "vod123",
      streamerId: "streamer1",
      streamId: "broadcast123",
      startedAt: new Date().toISOString(),
      durationSeconds: 7200,
    };

    const linked = await linkingService.linkVod(vodPayload);
    expect(linked).toHaveLength(0);
  });
});
