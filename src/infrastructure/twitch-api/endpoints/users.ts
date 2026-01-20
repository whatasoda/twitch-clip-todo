import type { TwitchApiClient } from "../client";
import type { TwitchUser } from "../types";

export interface UsersEndpoint {
  getByLogin(login: string): Promise<TwitchUser | null>;
  getByLogins(logins: string[]): Promise<TwitchUser[]>;
  getById(id: string): Promise<TwitchUser | null>;
  getByIds(ids: string[]): Promise<TwitchUser[]>;
}

export function createUsersEndpoint(client: TwitchApiClient): UsersEndpoint {
  return {
    async getByLogin(login: string): Promise<TwitchUser | null> {
      const response = await client.get<TwitchUser>("/users", { login });
      return response.data[0] ?? null;
    },

    async getByLogins(logins: string[]): Promise<TwitchUser[]> {
      if (logins.length === 0) return [];
      // Twitch API allows up to 100 logins per request
      const response = await client.get<TwitchUser>("/users", {
        login: logins.slice(0, 100).join("&login="),
      });
      return response.data;
    },

    async getById(id: string): Promise<TwitchUser | null> {
      const response = await client.get<TwitchUser>("/users", { id });
      return response.data[0] ?? null;
    },

    async getByIds(ids: string[]): Promise<TwitchUser[]> {
      if (ids.length === 0) return [];
      const response = await client.get<TwitchUser>("/users", { id: ids.join("&id=") });
      return response.data;
    },
  };
}
