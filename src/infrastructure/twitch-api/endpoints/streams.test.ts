import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TwitchApiClient } from "../client";
import type { TwitchApiResponse, TwitchStream } from "../types";
import { createStreamsEndpoint } from "./streams";

function createMockClient() {
  return {
    get: vi.fn(),
    isAuthenticated: vi.fn(),
    getRateLimitInfo: vi.fn(),
  } as unknown as TwitchApiClient & { get: ReturnType<typeof vi.fn> };
}

function makeResponse<T>(data: T[]): TwitchApiResponse<T> {
  return { data };
}

const sampleStream: TwitchStream = {
  id: "stream1",
  user_id: "123",
  user_login: "testuser",
  user_name: "TestUser",
  game_id: "456",
  game_name: "Just Chatting",
  type: "live",
  title: "Test Stream",
  tags: [],
  viewer_count: 100,
  started_at: "2024-06-15T10:00:00Z",
  language: "en",
  thumbnail_url: "https://example.com/thumb.jpg",
  is_mature: false,
};

describe("createStreamsEndpoint", () => {
  let client: ReturnType<typeof createMockClient>;
  let streams: ReturnType<typeof createStreamsEndpoint>;

  beforeEach(() => {
    client = createMockClient();
    streams = createStreamsEndpoint(client);
  });

  it("getByUserLogin calls /streams with user_login", async () => {
    client.get.mockResolvedValue(makeResponse([sampleStream]));

    const result = await streams.getByUserLogin("testuser");
    expect(result).toEqual(sampleStream);
    expect(client.get).toHaveBeenCalledWith("/streams", { user_login: "testuser" });
  });

  it("getByUserLogin returns null when no data", async () => {
    client.get.mockResolvedValue(makeResponse([]));

    const result = await streams.getByUserLogin("offlineuser");
    expect(result).toBeNull();
  });

  it("getByUserLogins returns empty for empty array", async () => {
    const result = await streams.getByUserLogins([]);
    expect(result).toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it("getByUserId calls /streams with user_id", async () => {
    client.get.mockResolvedValue(makeResponse([sampleStream]));

    const result = await streams.getByUserId("123");
    expect(result).toEqual(sampleStream);
    expect(client.get).toHaveBeenCalledWith("/streams", { user_id: "123" });
  });
});
