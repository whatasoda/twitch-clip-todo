import type { TwitchApiClient } from "../client";
import type { TwitchVideo } from "../types";

export interface VideosEndpoint {
  getById(id: string): Promise<TwitchVideo | null>;
  getByIds(ids: string[]): Promise<TwitchVideo[]>;
  getByUserId(userId: string, options?: { first?: number }): Promise<TwitchVideo[]>;
}

// Parse Twitch duration format (e.g., "3h45m20s") to seconds
export function parseTwitchDuration(duration: string): number {
  const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return parseInt(h ?? "0", 10) * 3600 + parseInt(m ?? "0", 10) * 60 + parseInt(s ?? "0", 10);
}

export function createVideosEndpoint(client: TwitchApiClient): VideosEndpoint {
  return {
    async getById(id: string): Promise<TwitchVideo | null> {
      const response = await client.get<TwitchVideo>("/videos", { id });
      return response.data[0] ?? null;
    },

    async getByIds(ids: string[]): Promise<TwitchVideo[]> {
      if (ids.length === 0) return [];
      // Twitch API allows up to 100 IDs per request
      const response = await client.get<TwitchVideo>("/videos", {
        id: ids.slice(0, 100).join("&id="),
      });
      return response.data;
    },

    async getByUserId(userId: string, options?: { first?: number }): Promise<TwitchVideo[]> {
      const params: Record<string, string> = { user_id: userId };
      if (options?.first) {
        params.first = options.first.toString();
      }
      const response = await client.get<TwitchVideo>("/videos", params);
      return response.data;
    },
  };
}
