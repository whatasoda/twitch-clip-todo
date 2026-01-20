// Twitch player DOM selectors
const SELECTORS = {
  // Live stream elapsed time (appears in the player controls)
  liveTime: '[data-a-target="player-seekbar-current-time"]',
  // VOD current time
  vodTime: '[data-a-target="player-seekbar-current-time"]',
  // Alternative selectors
  videoTime: ".video-player__default-player video",
};

// Parse time string like "1:30:45" to seconds
function parseTimeDisplay(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes ?? 0) * 60 + (seconds ?? 0);
  }
  return 0;
}

export function getPlayerTimestamp(): number | null {
  // Try to get from player UI
  const timeElement = document.querySelector(SELECTORS.liveTime);
  if (timeElement?.textContent) {
    return parseTimeDisplay(timeElement.textContent);
  }

  // Fallback: try to get from video element
  const videoElement = document.querySelector(SELECTORS.videoTime) as HTMLVideoElement | null;
  if (videoElement?.currentTime) {
    return Math.floor(videoElement.currentTime);
  }

  return null;
}

export function getStreamerNameFromPage(): string | null {
  // Try to get from the URL first (most reliable for live streams)
  const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
  if (match?.[1]) {
    // Exclude known non-streamer paths
    const excluded = [
      "videos",
      "directory",
      "downloads",
      "jobs",
      "settings",
      "moderator",
      "popout",
    ];
    if (!excluded.includes(match[1].toLowerCase())) {
      return match[1];
    }
  }

  // Multiple selectors to try for finding the channel name
  const selectors = [
    // VOD page - video owner link
    'a[data-a-target="video-owner-link"]',
    // VOD page - channel link in video info
    'a[data-a-target="user-channel-header-item"]',
    // Channel header
    '[data-a-target="stream-title"]',
    // Channel name in the header
    "h1.tw-title",
    // Another common location
    'a[data-test-selector="user-avatar-image"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Try href first (for links)
      const href = element.getAttribute("href");
      if (href) {
        const hrefMatch = href.match(/^\/([a-zA-Z0-9_]+)/);
        if (hrefMatch?.[1] && !["videos", "directory"].includes(hrefMatch[1].toLowerCase())) {
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

  // Last resort: look for any link that looks like a channel link
  const channelLinks = document.querySelectorAll('a[href^="/"]');
  for (const link of channelLinks) {
    const href = link.getAttribute("href");
    if (href) {
      const linkMatch = href.match(/^\/([a-zA-Z0-9_]{3,25})$/);
      if (linkMatch?.[1]) {
        const excluded = [
          "videos",
          "directory",
          "downloads",
          "jobs",
          "settings",
          "search",
          "following",
        ];
        if (!excluded.includes(linkMatch[1].toLowerCase())) {
          // Check if this link is in a context that suggests it's a channel
          const parent = link.closest(
            '[class*="channel"], [class*="video-info"], [class*="stream-info"]',
          );
          if (parent) {
            return linkMatch[1];
          }
        }
      }
    }
  }

  return null;
}

export interface VodMetadata {
  vodId: string;
  streamerId: string;
  startedAt: string | null;
  durationSeconds: number | null;
}

export function getVodMetadata(): VodMetadata | null {
  // Extract VOD ID from URL
  const vodMatch = window.location.pathname.match(/^\/videos\/(\d+)/);
  if (!vodMatch?.[1]) {
    return null;
  }

  const vodId = vodMatch[1];
  const streamerId = getStreamerNameFromPage();

  // Try to get duration from video element
  const videoElement = document.querySelector(SELECTORS.videoTime) as HTMLVideoElement | null;
  const durationSeconds = videoElement?.duration ? Math.floor(videoElement.duration) : null;

  return {
    vodId,
    streamerId: streamerId?.toLowerCase() ?? "",
    startedAt: null, // Would need Twitch API or DOM scraping for accurate time
    durationSeconds,
  };
}
