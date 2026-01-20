import type { TwitchApiClient } from "../client";
import type { TwitchStream } from "../types";

export interface StreamsEndpoint {
  getByUserLogin(userLogin: string): Promise<TwitchStream | null>;
  getByUserLogins(userLogins: string[]): Promise<TwitchStream[]>;
  getByUserId(userId: string): Promise<TwitchStream | null>;
}

export function createStreamsEndpoint(client: TwitchApiClient): StreamsEndpoint {
  return {
    async getByUserLogin(userLogin: string): Promise<TwitchStream | null> {
      const response = await client.get<TwitchStream>("/streams", { user_login: userLogin });
      return response.data[0] ?? null;
    },

    async getByUserLogins(userLogins: string[]): Promise<TwitchStream[]> {
      if (userLogins.length === 0) return [];
      const response = await client.get<TwitchStream>("/streams", {
        user_login: userLogins.slice(0, 100).join("&user_login="),
      });
      return response.data;
    },

    async getByUserId(userId: string): Promise<TwitchStream | null> {
      const response = await client.get<TwitchStream>("/streams", { user_id: userId });
      return response.data[0] ?? null;
    },
  };
}
