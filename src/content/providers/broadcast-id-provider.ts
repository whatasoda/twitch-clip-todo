import { getCurrentStreamCached } from "../messaging";
import type { Provider } from "./types";

export interface BroadcastIdResult {
  broadcastId: string;
  source: "api";
}

/**
 * API provider for broadcast ID (stream_id).
 * Only available for live streams via the Twitch API.
 */
export function createApiBroadcastIdProvider(login: string): Provider<BroadcastIdResult> {
  return {
    name: "api-broadcast-id",
    async get(): Promise<BroadcastIdResult | null> {
      const streamInfo = await getCurrentStreamCached(login);
      if (!streamInfo?.streamId) return null;

      return {
        broadcastId: streamInfo.streamId,
        source: "api",
      };
    },
  };
}

/**
 * Get broadcast ID for a live stream.
 */
export async function getBroadcastId(login: string): Promise<BroadcastIdResult | null> {
  const provider = createApiBroadcastIdProvider(login);
  return provider.get();
}
