export const EXTENSION_NAME = "Twitch Clip Todo";

export const STORAGE_KEYS = {
  RECORDS: "records",
  SETTINGS: "settings",
  TWITCH_AUTH: "twitch_auth",
} as const;

// Twitch API configuration
// Client ID should be set via environment variable or replaced before build
export const TWITCH_CLIENT_ID = "__TWITCH_CLIENT_ID__";
export const TWITCH_REDIRECT_URI =
  typeof chrome !== "undefined" && chrome.identity
    ? chrome.identity.getRedirectURL()
    : "https://localhost/callback";

export const DEFAULT_CLEANUP_DAYS = 60;
