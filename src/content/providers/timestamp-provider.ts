import { parseTimeString } from "../../core/twitch/timestamp-parser";
import { getCurrentStreamCached } from "../messaging";
import { chainProviders, type Provider } from "./types";

export interface TimestampResult {
  seconds: number;
  source: "api" | "dom-player" | "dom-video";
}

// DOM selectors for player timestamp
const SELECTORS = {
  playerTime: '[data-a-target="player-seekbar-current-time"]',
  videoElement: ".video-player__default-player video",
};

/**
 * API provider for live stream timestamp.
 * Calculates elapsed time from stream's started_at time.
 */
export function createApiTimestampProvider(login: string): Provider<TimestampResult> {
  return {
    name: "api-timestamp",
    async get(): Promise<TimestampResult | null> {
      const streamInfo = await getCurrentStreamCached(login);
      if (!streamInfo?.startedAt) return null;

      const elapsedMs = Date.now() - new Date(streamInfo.startedAt).getTime();
      const seconds = Math.floor(elapsedMs / 1000);
      if (seconds < 0) return null;

      return { seconds, source: "api" };
    },
  };
}

/**
 * DOM provider using player UI timestamp display.
 */
export function createDomPlayerTimestampProvider(): Provider<TimestampResult> {
  return {
    name: "dom-player-timestamp",
    async get(): Promise<TimestampResult | null> {
      const timeElement = document.querySelector(SELECTORS.playerTime);
      if (!timeElement?.textContent) return null;

      const seconds = parseTimeString(timeElement.textContent);
      return { seconds, source: "dom-player" };
    },
  };
}

/**
 * DOM provider using video element currentTime.
 * Fallback for when player UI is not available.
 */
export function createDomVideoTimestampProvider(): Provider<TimestampResult> {
  return {
    name: "dom-video-timestamp",
    async get(): Promise<TimestampResult | null> {
      const videoElement = document.querySelector(
        SELECTORS.videoElement,
      ) as HTMLVideoElement | null;
      if (!videoElement?.currentTime) return null;

      return { seconds: Math.floor(videoElement.currentTime), source: "dom-video" };
    },
  };
}

/**
 * Get timestamp for live stream with API -> DOM fallback chain.
 */
export async function getLiveTimestamp(login: string): Promise<TimestampResult | null> {
  return chainProviders([
    createApiTimestampProvider(login),
    createDomPlayerTimestampProvider(),
    createDomVideoTimestampProvider(),
  ]);
}

/**
 * Get timestamp for VOD with DOM-only chain.
 */
export async function getVodTimestamp(): Promise<TimestampResult | null> {
  return chainProviders([createDomPlayerTimestampProvider(), createDomVideoTimestampProvider()]);
}
