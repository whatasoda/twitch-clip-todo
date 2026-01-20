import type {
  TwitchApiClient,
  TwitchAuthAPI,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "../infrastructure/twitch-api";
import {
  createStreamsEndpoint,
  createUsersEndpoint,
  createVideosEndpoint,
  parseTwitchDuration,
  type StreamsEndpoint,
  type UsersEndpoint,
  type VideosEndpoint,
} from "../infrastructure/twitch-api/endpoints";

export interface StreamerInfo {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface VodMetadata {
  vodId: string;
  streamerId: string;
  streamerName: string;
  title: string;
  startedAt: Date;
  durationSeconds: number;
  streamId: string | null;
}

export interface LiveStreamInfo {
  streamId: string;
  userId: string;
  userLogin: string;
  userName: string;
  startedAt: Date;
  title: string;
  gameName: string;
}

export interface TwitchServiceDeps {
  auth: TwitchAuthAPI;
  client: TwitchApiClient;
}

export interface TwitchService {
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  logout(): Promise<void>;
  getStreamerInfo(login: string): Promise<StreamerInfo | null>;
  getVodMetadata(vodId: string): Promise<VodMetadata | null>;
  getCurrentStream(login: string): Promise<LiveStreamInfo | null>;
}

export function createTwitchService(deps: TwitchServiceDeps): TwitchService {
  const { auth, client } = deps;

  const usersEndpoint: UsersEndpoint = createUsersEndpoint(client);
  const videosEndpoint: VideosEndpoint = createVideosEndpoint(client);
  const streamsEndpoint: StreamsEndpoint = createStreamsEndpoint(client);

  // Simple in-memory cache for user info (cleared on service worker restart)
  const userCache = new Map<string, { data: StreamerInfo; expiresAt: number }>();
  const USER_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  function mapUserToStreamerInfo(user: TwitchUser): StreamerInfo {
    return {
      id: user.id,
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url || null,
    };
  }

  function mapVideoToVodMetadata(video: TwitchVideo): VodMetadata {
    return {
      vodId: video.id,
      streamerId: video.user_login,
      streamerName: video.user_name,
      title: video.title,
      startedAt: new Date(video.created_at),
      durationSeconds: parseTwitchDuration(video.duration),
      streamId: video.stream_id,
    };
  }

  function mapStreamToLiveStreamInfo(stream: TwitchStream): LiveStreamInfo {
    return {
      streamId: stream.id,
      userId: stream.user_id,
      userLogin: stream.user_login,
      userName: stream.user_name,
      startedAt: new Date(stream.started_at),
      title: stream.title,
      gameName: stream.game_name,
    };
  }

  return {
    async isAuthenticated(): Promise<boolean> {
      return client.isAuthenticated();
    },

    async authenticate(): Promise<void> {
      await auth.authenticate();
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

      // Check cache
      const cached = userCache.get(normalizedLogin);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      try {
        const user = await usersEndpoint.getByLogin(normalizedLogin);
        if (!user) return null;

        const streamerInfo = mapUserToStreamerInfo(user);

        // Update cache
        userCache.set(normalizedLogin, {
          data: streamerInfo,
          expiresAt: Date.now() + USER_CACHE_TTL,
        });

        return streamerInfo;
      } catch {
        // API error - return null to trigger fallback
        return null;
      }
    },

    async getVodMetadata(vodId: string): Promise<VodMetadata | null> {
      try {
        const video = await videosEndpoint.getById(vodId);
        if (!video) return null;
        return mapVideoToVodMetadata(video);
      } catch {
        return null;
      }
    },

    async getCurrentStream(login: string): Promise<LiveStreamInfo | null> {
      try {
        const stream = await streamsEndpoint.getByUserLogin(login.toLowerCase());
        if (!stream) return null;
        return mapStreamToLiveStreamInfo(stream);
      } catch {
        return null;
      }
    },
  };
}
