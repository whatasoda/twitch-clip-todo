export const EXTENSION_NAME = "Twitch Clip Todo";

export const STORAGE_KEYS = {
  RECORDS: "records",
  SETTINGS: "settings",
  TWITCH_AUTH: "twitch_auth",
  STREAM_CACHE: "stream_cache",
  VOD_CACHE: "vod_cache",
  ONBOARDING: "onboarding",
} as const;

// Twitch API configuration
// Client ID should be set via environment variable or replaced before build
// cspell:disable-next-line
export const TWITCH_CLIENT_ID = "ut0bh6j4ehxyff1fxdm0rbo0jmirrg";

export const DEFAULT_CLEANUP_DAYS = 60;

// Cache TTL values in milliseconds
export const CACHE_TTL = {
  STREAM: 5 * 60 * 1000, // 5 minutes - live stream info doesn't change frequently
  VOD: 24 * 60 * 60 * 1000, // 24 hours - VOD list is relatively stable
  USER: 60 * 60 * 1000, // 1 hour - user profile info (existing behavior)
} as const;

// VOD Discovery timing
export const VOD_DISCOVERY = {
  INTERVAL_MINUTES: 15, // How often to run automatic VOD discovery
  INITIAL_DELAY_MS: 30 * 60 * 1000, // 30 minutes - wait after stream ends before first try
} as const;
