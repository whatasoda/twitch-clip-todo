import { getStreamerInfo } from "../messaging";
import { chainProviders, type Provider } from "./types";

export interface StreamerResult {
  displayName: string;
  login: string;
  source: "api" | "dom";
}

// Known non-streamer paths to exclude
const EXCLUDED_PATHS = [
  "videos",
  "directory",
  "downloads",
  "jobs",
  "settings",
  "moderator",
  "popout",
  "search",
  "following",
];

/**
 * API provider for streamer info.
 */
export function createApiStreamerProvider(login: string): Provider<StreamerResult> {
  return {
    name: "api-streamer",
    async get(): Promise<StreamerResult | null> {
      const info = await getStreamerInfo(login);
      if (!info) return null;

      return {
        displayName: info.displayName,
        login: info.login,
        source: "api",
      };
    },
  };
}

/**
 * DOM provider for streamer info.
 * Extracts from URL and various DOM elements.
 */
export function createDomStreamerProvider(): Provider<StreamerResult> {
  return {
    name: "dom-streamer",
    async get(): Promise<StreamerResult | null> {
      // Try URL first (most reliable)
      const urlLogin = getLoginFromUrl();
      if (urlLogin) {
        return {
          displayName: urlLogin,
          login: urlLogin.toLowerCase(),
          source: "dom",
        };
      }

      // Try DOM elements
      const domLogin = getLoginFromDom();
      if (domLogin) {
        return {
          displayName: domLogin,
          login: domLogin.toLowerCase(),
          source: "dom",
        };
      }

      return null;
    },
  };
}

function getLoginFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
  if (match?.[1] && !EXCLUDED_PATHS.includes(match[1].toLowerCase())) {
    return match[1];
  }
  return null;
}

function getLoginFromDom(): string | null {
  // Multiple selectors to try for finding the channel name
  const selectors = [
    'a[data-a-target="video-owner-link"]',
    'a[data-a-target="user-channel-header-item"]',
    '[data-a-target="stream-title"]',
    "h1.tw-title",
    'a[data-test-selector="user-avatar-image"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Try href first (for links)
      const href = element.getAttribute("href");
      if (href) {
        const hrefMatch = href.match(/^\/([a-zA-Z0-9_]+)/);
        if (hrefMatch?.[1] && !EXCLUDED_PATHS.includes(hrefMatch[1].toLowerCase())) {
          return hrefMatch[1];
        }
      }
      // Try text content
      const text = element.textContent?.trim();
      if (text && /^[a-zA-Z0-9_]+$/.test(text)) {
        return text;
      }
    }
  }

  // Last resort: look for channel links in context
  const channelLinks = document.querySelectorAll('a[href^="/"]');
  for (const link of channelLinks) {
    const href = link.getAttribute("href");
    if (href) {
      const linkMatch = href.match(/^\/([a-zA-Z0-9_]{3,25})$/);
      if (linkMatch?.[1] && !EXCLUDED_PATHS.includes(linkMatch[1].toLowerCase())) {
        const parent = link.closest(
          '[class*="channel"], [class*="video-info"], [class*="stream-info"]',
        );
        if (parent) {
          return linkMatch[1];
        }
      }
    }
  }

  return null;
}

/**
 * Get streamer info with API -> DOM fallback chain.
 * If loginFromUrl is provided, API will be tried first.
 */
export async function getStreamerWithFallback(
  loginFromUrl: string | null,
): Promise<StreamerResult | null> {
  const providers: Provider<StreamerResult>[] = [];

  // Add API provider if we have a login to query
  if (loginFromUrl) {
    providers.push(createApiStreamerProvider(loginFromUrl));
  }

  // Always add DOM provider as fallback
  providers.push(createDomStreamerProvider());

  return chainProviders(providers);
}
