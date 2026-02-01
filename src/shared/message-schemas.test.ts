import { describe, expect, it } from "vitest";
import {
  createRecordPayloadSchema,
  getRecordsPayloadSchema,
  idPayloadSchema,
  linkVodPayloadSchema,
  loginPayloadSchema,
  memoPayloadSchema,
  onboardingStateSchema,
  pollTokenPayloadSchema,
  streamerIdPayloadSchema,
  vodIdPayloadSchema,
} from "./message-schemas";

describe("createRecordPayloadSchema", () => {
  it("accepts valid live record payload", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: 3600,
      sourceType: "live",
      vodId: null,
      broadcastId: "broadcast123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid vod record with vodId", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: 1200,
      sourceType: "vod",
      vodId: "vod456",
      broadcastId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional memo field", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: 100,
      sourceType: "live",
      vodId: null,
      broadcastId: null,
      memo: "nice play",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBe("nice play");
    }
  });

  it("rejects invalid sourceType", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: 100,
      sourceType: "clip",
      vodId: null,
      broadcastId: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong types (timestampSeconds as string)", () => {
    const result = createRecordPayloadSchema.safeParse({
      streamerId: "streamer1",
      streamerName: "Streamer One",
      timestampSeconds: "3600",
      sourceType: "live",
      vodId: null,
      broadcastId: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("linkVodPayloadSchema", () => {
  it("accepts valid complete payload", () => {
    const result = linkVodPayloadSchema.safeParse({
      vodId: "vod123",
      streamerId: "streamer1",
      streamId: "stream456",
      startedAt: "2024-01-01T00:00:00Z",
      durationSeconds: 7200,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = linkVodPayloadSchema.safeParse({
      vodId: "vod123",
    });
    expect(result.success).toBe(false);
  });
});

describe("onboardingStateSchema", () => {
  it("accepts valid boolean flags", () => {
    const result = onboardingStateSchema.safeParse({
      hasSeenTwitchToast: true,
      hasSeenFirstRecordHint: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean values", () => {
    const result = onboardingStateSchema.safeParse({
      hasSeenTwitchToast: "yes",
      hasSeenFirstRecordHint: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("idPayloadSchema", () => {
  it("accepts valid string id", () => {
    const result = idPayloadSchema.safeParse({ id: "abc123" });
    expect(result.success).toBe(true);
  });

  it("rejects non-string id", () => {
    const result = idPayloadSchema.safeParse({ id: 123 });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = idPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("loginPayloadSchema", () => {
  it("accepts valid string login", () => {
    const result = loginPayloadSchema.safeParse({ login: "testuser" });
    expect(result.success).toBe(true);
  });

  it("rejects non-string login", () => {
    const result = loginPayloadSchema.safeParse({ login: 42 });
    expect(result.success).toBe(false);
  });
});

describe("vodIdPayloadSchema", () => {
  it("accepts valid string vodId", () => {
    const result = vodIdPayloadSchema.safeParse({ vodId: "v123456" });
    expect(result.success).toBe(true);
  });

  it("rejects missing vodId", () => {
    const result = vodIdPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("streamerIdPayloadSchema", () => {
  it("accepts valid string streamerId", () => {
    const result = streamerIdPayloadSchema.safeParse({ streamerId: "user1" });
    expect(result.success).toBe(true);
  });

  it("rejects non-string streamerId", () => {
    const result = streamerIdPayloadSchema.safeParse({ streamerId: true });
    expect(result.success).toBe(false);
  });
});

describe("memoPayloadSchema", () => {
  it("accepts valid id + memo", () => {
    const result = memoPayloadSchema.safeParse({ id: "rec1", memo: "great play" });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = memoPayloadSchema.safeParse({ memo: "great play" });
    expect(result.success).toBe(false);
  });
});

describe("pollTokenPayloadSchema", () => {
  it("accepts valid deviceCode + interval", () => {
    const result = pollTokenPayloadSchema.safeParse({
      deviceCode: "code123",
      interval: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects string interval", () => {
    const result = pollTokenPayloadSchema.safeParse({
      deviceCode: "code123",
      interval: "5",
    });
    expect(result.success).toBe(false);
  });
});

describe("getRecordsPayloadSchema", () => {
  it("accepts undefined", () => {
    const result = getRecordsPayloadSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = getRecordsPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts object with streamerId", () => {
    const result = getRecordsPayloadSchema.safeParse({ streamerId: "user1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.streamerId).toBe("user1");
    }
  });

  it("rejects invalid nested structure", () => {
    const result = getRecordsPayloadSchema.safeParse({ streamerId: 123 });
    expect(result.success).toBe(false);
  });
});
