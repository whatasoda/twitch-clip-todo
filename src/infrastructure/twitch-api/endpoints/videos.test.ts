import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TwitchApiClient } from "../client";
import type { TwitchApiResponse, TwitchVideo } from "../types";
import { createVideosEndpoint } from "./videos";

function createMockClient() {
  return {
    get: vi.fn(),
    isAuthenticated: vi.fn(),
    getRateLimitInfo: vi.fn(),
  } as unknown as TwitchApiClient & { get: ReturnType<typeof vi.fn> };
}

function makeResponse<T>(data: T[], cursor?: string): TwitchApiResponse<T> {
  return { data, pagination: cursor ? { cursor } : undefined };
}

const sampleVideo: TwitchVideo = {
  id: "v98765",
  stream_id: "stream111",
  user_id: "123",
  user_login: "testuser",
  user_name: "TestUser",
  title: "Test VOD",
  description: "",
  created_at: "2024-06-15T10:00:00Z",
  published_at: "2024-06-15T10:00:00Z",
  url: "https://www.twitch.tv/videos/98765",
  thumbnail_url: "https://example.com/thumb.jpg",
  viewable: "public",
  view_count: 1000,
  language: "en",
  type: "archive",
  duration: "3h45m20s",
};

describe("createVideosEndpoint", () => {
  let client: ReturnType<typeof createMockClient>;
  let videos: ReturnType<typeof createVideosEndpoint>;

  beforeEach(() => {
    client = createMockClient();
    videos = createVideosEndpoint(client);
  });

  it("getById calls /videos with id param", async () => {
    client.get.mockResolvedValue(makeResponse([sampleVideo]));

    const result = await videos.getById("v98765");
    expect(result).toEqual(sampleVideo);
    expect(client.get).toHaveBeenCalledWith("/videos", { id: "v98765" });
  });

  it("getById returns null when no data", async () => {
    client.get.mockResolvedValue(makeResponse([]));

    const result = await videos.getById("nonexistent");
    expect(result).toBeNull();
  });

  it("getByIds returns empty for empty array", async () => {
    const result = await videos.getByIds([]);
    expect(result).toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it("getByUserId passes options (first, type, after)", async () => {
    client.get.mockResolvedValue(makeResponse([sampleVideo]));

    await videos.getByUserId("123", { first: 10, type: "archive", after: "cursor1" });
    expect(client.get).toHaveBeenCalledWith("/videos", {
      user_id: "123",
      first: "10",
      type: "archive",
      after: "cursor1",
    });
  });

  it("getByUserIdWithPagination returns cursor", async () => {
    client.get.mockResolvedValue(makeResponse([sampleVideo], "next_cursor"));

    const result = await videos.getByUserIdWithPagination("123", { first: 5 });
    expect(result.videos).toEqual([sampleVideo]);
    expect(result.cursor).toBe("next_cursor");
  });

  it("getArchivesByUserId sets type to archive", async () => {
    client.get.mockResolvedValue(makeResponse([sampleVideo]));

    await videos.getArchivesByUserId("123", { first: 20 });
    expect(client.get).toHaveBeenCalledWith("/videos", {
      user_id: "123",
      first: "20",
      type: "archive",
    });
  });
});
