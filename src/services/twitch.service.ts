import type { ChromeStorageAPI } from "../infrastructure/chrome/types";
import type {
  DeviceCodeResponse,
  PollingState,
  TwitchApiClient,
  TwitchAuthAPI,
  TwitchAuthToken,
} from "../infrastructure/twitch-api";
import {
  createStreamsEndpoint,
  createUsersEndpoint,
  createVideosEndpoint,
  type StreamsEndpoint,
  type UsersEndpoint,
  type VideosEndpoint,
} from "../infrastructure/twitch-api/endpoints";
import { CACHE_TTL, STORAGE_KEYS } from "../shared/constants";
import { logger } from "../shared/logger";
import type { CacheEntry } from "./cache.service";
import {
  type LiveStreamInfo,
  mapStreamToLiveStreamInfo,
  mapUserToStreamerInfo,
  mapVideoToVodMetadata,
  type StreamerInfo,
  type VodMetadata,
} from "./twitch-mappers";

// Re-export types for external use
export type { LiveStreamInfo, StreamerInfo, VodMetadata };

export interface TwitchServiceDeps {
  auth: TwitchAuthAPI;
  client: TwitchApiClient;
  storage: ChromeStorageAPI;
}

export interface TwitchService {
  isAuthenticated(): Promise<boolean>;
  startDeviceAuth(): Promise<DeviceCodeResponse>;
  pollForToken(
    deviceCode: string,
    interval: number,
    deviceInfo: { userCode: string; verificationUri: string; expiresIn: number },
  ): Promise<TwitchAuthToken>;
  getAuthProgress(): PollingState | null;
  awaitNextPoll(): Promise<void>;
  cancelAuth(): void;
  logout(): Promise<void>;
  getStreamerInfo(login: string): Promise<StreamerInfo | null>;
  getVodMetadata(vodId: string): Promise<VodMetadata | null>;
  getCurrentStream(login: string): Promise<LiveStreamInfo | null>;
  // Cached versions
  getCurrentStreamCached(login: string): Promise<LiveStreamInfo | null>;
  invalidateStreamCache(login: string): Promise<void>;
  // VOD discovery
  getRecentVodsByUserId(userId: string, limit?: number): Promise<VodMetadata[]>;
  findVodByStreamId(userId: string, streamId: string): Promise<VodMetadata | null>;
}

// Persistent cache types using CacheEntry from cache.service
type StreamCache = Record<string, CacheEntry<LiveStreamInfo | null>>;
type VodCache = Record<string, CacheEntry<VodMetadata[]>>;

export function createTwitchService(deps: TwitchServiceDeps): TwitchService {
  const { auth, client, storage } = deps;

  const usersEndpoint: UsersEndpoint = createUsersEndpoint(client);
  const videosEndpoint: VideosEndpoint = createVideosEndpoint(client);
  const streamsEndpoint: StreamsEndpoint = createStreamsEndpoint(client);

  // In-memory caches (fast, but cleared on service worker restart)
  const userMemCache = new Map<string, CacheEntry<StreamerInfo>>();
  const streamMemCache = new Map<string, CacheEntry<LiveStreamInfo | null>>();
  const vodMemCache = new Map<string, CacheEntry<VodMetadata[]>>();

  // Helper to get persistent stream cache
  async function getPersistentStreamCache(): Promise<StreamCache> {
    return (await storage.get<StreamCache>(STORAGE_KEYS.STREAM_CACHE)) ?? {};
  }

  async function updatePersistentStreamCache(
    login: string,
    entry: CacheEntry<LiveStreamInfo | null>,
  ): Promise<void> {
    const cache = await getPersistentStreamCache();
    cache[login] = entry;
    await storage.set(STORAGE_KEYS.STREAM_CACHE, cache);
  }

  // Helper to get persistent VOD cache
  async function getPersistentVodCache(): Promise<VodCache> {
    return (await storage.get<VodCache>(STORAGE_KEYS.VOD_CACHE)) ?? {};
  }

  async function updatePersistentVodCache(
    userId: string,
    entry: CacheEntry<VodMetadata[]>,
  ): Promise<void> {
    const cache = await getPersistentVodCache();
    cache[userId] = entry;
    await storage.set(STORAGE_KEYS.VOD_CACHE, cache);
  }

  return {
    async isAuthenticated(): Promise<boolean> {
      return client.isAuthenticated();
    },

    async startDeviceAuth(): Promise<DeviceCodeResponse> {
      return auth.startDeviceAuth();
    },

    async pollForToken(
      deviceCode: string,
      interval: number,
      deviceInfo: { userCode: string; verificationUri: string; expiresIn: number },
    ): Promise<TwitchAuthToken> {
      return auth.pollForToken(deviceCode, interval, deviceInfo);
    },

    getAuthProgress(): PollingState | null {
      return auth.getPollingState();
    },

    awaitNextPoll(): Promise<void> {
      return auth.awaitNextPoll();
    },

    cancelAuth(): void {
      auth.cancelPolling();
    },

    async logout(): Promise<void> {
      const token = await auth.getStoredToken();
      if (token) {
        await auth.revokeToken(token.access_token);
        await auth.clearToken();
      }
    },

    async getStreamerInfo(login: string): Promise<StreamerInfo | null> {
      const normalizedLogin = login.toLowerCase();

      // Check in-memory cache
      const cached = userMemCache.get(normalizedLogin);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      try {
        const user = await usersEndpoint.getByLogin(normalizedLogin);
        if (!user) return null;

        const streamerInfo = mapUserToStreamerInfo(user);

        // Update in-memory cache
        userMemCache.set(normalizedLogin, {
          data: streamerInfo,
          expiresAt: Date.now() + CACHE_TTL.USER,
        });

        return streamerInfo;
      } catch (error) {
        logger.warn("getStreamerInfo failed:", error);
        return null;
      }
    },

    async getVodMetadata(vodId: string): Promise<VodMetadata | null> {
      try {
        const video = await videosEndpoint.getById(vodId);
        if (!video) return null;
        return mapVideoToVodMetadata(video);
      } catch (error) {
        logger.warn("getVodMetadata failed:", error);
        return null;
      }
    },

    async getCurrentStream(login: string): Promise<LiveStreamInfo | null> {
      try {
        const stream = await streamsEndpoint.getByUserLogin(login.toLowerCase());
        if (!stream) return null;
        return mapStreamToLiveStreamInfo(stream);
      } catch (error) {
        logger.warn("getCurrentStream failed:", error);
        return null;
      }
    },

    async getCurrentStreamCached(login: string): Promise<LiveStreamInfo | null> {
      const normalizedLogin = login.toLowerCase();

      // Check in-memory cache first (fastest)
      const memCached = streamMemCache.get(normalizedLogin);
      if (memCached && memCached.expiresAt > Date.now()) {
        return memCached.data;
      }

      // Check persistent cache (survives SW restart)
      const persistentCache = await getPersistentStreamCache();
      const cached = persistentCache[normalizedLogin];
      if (cached && cached.expiresAt > Date.now()) {
        // Hydrate memory cache
        streamMemCache.set(normalizedLogin, cached);
        return cached.data;
      }

      // Cache miss - fetch from API
      const stream = await this.getCurrentStream(login);

      // Update both caches
      const entry: CacheEntry<LiveStreamInfo | null> = {
        data: stream,
        expiresAt: Date.now() + CACHE_TTL.STREAM,
      };
      streamMemCache.set(normalizedLogin, entry);
      await updatePersistentStreamCache(normalizedLogin, entry);

      return stream;
    },

    async invalidateStreamCache(login: string): Promise<void> {
      const normalizedLogin = login.toLowerCase();

      // Clear in-memory cache
      streamMemCache.delete(normalizedLogin);

      // Clear persistent cache
      const cache = await getPersistentStreamCache();
      delete cache[normalizedLogin];
      await storage.set(STORAGE_KEYS.STREAM_CACHE, cache);
    },

    async getRecentVodsByUserId(userId: string, limit = 20): Promise<VodMetadata[]> {
      // Check in-memory cache first
      const memCached = vodMemCache.get(userId);
      if (memCached && memCached.expiresAt > Date.now()) {
        return memCached.data;
      }

      // Check persistent cache
      const persistentCache = await getPersistentVodCache();
      const cached = persistentCache[userId];
      if (cached && cached.expiresAt > Date.now()) {
        // Hydrate memory cache
        vodMemCache.set(userId, cached);
        return cached.data;
      }

      // Cache miss - fetch from API
      try {
        const videos = await videosEndpoint.getArchivesByUserId(userId, { first: limit });
        const vods = videos.map(mapVideoToVodMetadata);

        // Update both caches
        const entry: CacheEntry<VodMetadata[]> = {
          data: vods,
          expiresAt: Date.now() + CACHE_TTL.VOD,
        };
        vodMemCache.set(userId, entry);
        await updatePersistentVodCache(userId, entry);

        return vods;
      } catch (error) {
        logger.warn("getRecentVodsByUserId failed:", error);
        return [];
      }
    },

    async findVodByStreamId(userId: string, streamId: string): Promise<VodMetadata | null> {
      const vods = await this.getRecentVodsByUserId(userId);
      return vods.find((v) => v.streamId === streamId) ?? null;
    },
  };
}
