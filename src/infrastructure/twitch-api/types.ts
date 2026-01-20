// Twitch API response types

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  created_at: string;
}

export interface TwitchVideo {
  id: string;
  stream_id: string | null;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string; // ISO 8601
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: string;
  view_count: number;
  language: string;
  type: string;
  duration: string; // e.g., "3h45m20s"
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  tags: string[];
  viewer_count: number;
  started_at: string; // ISO 8601
  language: string;
  thumbnail_url: string;
  is_mature: boolean;
}

export interface TwitchApiResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
  };
}

export interface TwitchAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
  obtained_at: number; // Date.now() when token was obtained
}

export interface TwitchTokenValidation {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

export class TwitchApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "TwitchApiError";
  }
}
