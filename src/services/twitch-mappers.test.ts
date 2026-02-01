import { describe, expect, it } from "vitest";
import type { TwitchStream, TwitchUser, TwitchVideo } from "../infrastructure/twitch-api";
import {
  mapStreamToLiveStreamInfo,
  mapUserToStreamerInfo,
  mapVideoToVodMetadata,
} from "./twitch-mappers";

function createTwitchUser(overrides?: Partial<TwitchUser>): TwitchUser {
  return {
    id: "12345",
    login: "teststreamer",
    display_name: "TestStreamer",
    type: "",
    broadcaster_type: "partner",
    description: "A test streamer",
    profile_image_url: "https://example.com/avatar.jpg",
    offline_image_url: "https://example.com/offline.jpg",
    created_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

function createTwitchVideo(overrides?: Partial<TwitchVideo>): TwitchVideo {
  return {
    id: "v98765",
    stream_id: "stream111",
    user_id: "12345",
    user_login: "teststreamer",
    user_name: "TestStreamer",
    title: "Test Stream VOD",
    description: "A test VOD",
    created_at: "2024-06-15T10:00:00Z",
    published_at: "2024-06-15T10:00:00Z",
    url: "https://www.twitch.tv/videos/98765",
    thumbnail_url: "https://example.com/thumb.jpg",
    viewable: "public",
    view_count: 1000,
    language: "en",
    type: "archive",
    duration: "3h45m20s",
    ...overrides,
  };
}

function createTwitchStream(overrides?: Partial<TwitchStream>): TwitchStream {
  return {
    id: "stream999",
    user_id: "12345",
    user_login: "teststreamer",
    user_name: "TestStreamer",
    game_id: "12345",
    game_name: "Just Chatting",
    type: "live",
    title: "Test Stream",
    tags: ["English"],
    viewer_count: 500,
    started_at: "2024-06-15T10:00:00Z",
    language: "en",
    thumbnail_url: "https://example.com/thumb.jpg",
    is_mature: false,
    ...overrides,
  };
}

describe("mapUserToStreamerInfo", () => {
  it("maps all fields correctly", () => {
    const user = createTwitchUser();
    const result = mapUserToStreamerInfo(user);

    expect(result).toEqual({
      id: "12345",
      login: "teststreamer",
      displayName: "TestStreamer",
      profileImageUrl: "https://example.com/avatar.jpg",
    });
  });

  it("converts empty string profile_image_url to null", () => {
    const user = createTwitchUser({ profile_image_url: "" });
    const result = mapUserToStreamerInfo(user);

    expect(result.profileImageUrl).toBeNull();
  });
});

describe("mapVideoToVodMetadata", () => {
  it("maps all fields correctly", () => {
    const video = createTwitchVideo();
    const result = mapVideoToVodMetadata(video);

    expect(result).toEqual({
      vodId: "v98765",
      streamerId: "teststreamer",
      streamerName: "TestStreamer",
      title: "Test Stream VOD",
      startedAt: "2024-06-15T10:00:00Z",
      durationSeconds: 3 * 3600 + 45 * 60 + 20,
      streamId: "stream111",
    });
  });

  it("parses duration '3h45m20s' to seconds", () => {
    const video = createTwitchVideo({ duration: "3h45m20s" });
    const result = mapVideoToVodMetadata(video);

    expect(result.durationSeconds).toBe(13520);
  });

  it("preserves null stream_id", () => {
    const video = createTwitchVideo({ stream_id: null });
    const result = mapVideoToVodMetadata(video);

    expect(result.streamId).toBeNull();
  });

  it("parses short duration formats", () => {
    const video = createTwitchVideo({ duration: "45m10s" });
    const result = mapVideoToVodMetadata(video);

    expect(result.durationSeconds).toBe(45 * 60 + 10);
  });
});

describe("mapStreamToLiveStreamInfo", () => {
  it("maps all fields correctly", () => {
    const stream = createTwitchStream();
    const result = mapStreamToLiveStreamInfo(stream);

    expect(result).toEqual({
      streamId: "stream999",
      userId: "12345",
      userLogin: "teststreamer",
      userName: "TestStreamer",
      startedAt: "2024-06-15T10:00:00Z",
      title: "Test Stream",
      gameName: "Just Chatting",
    });
  });
});
