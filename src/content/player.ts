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
  // Try to get from the URL first (most reliable)
  const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
  if (match?.[1]) {
    // Exclude known non-streamer paths
    const excluded = ["videos", "directory", "downloads", "jobs", "settings"];
    if (!excluded.includes(match[1].toLowerCase())) {
      return match[1];
    }
  }

  // For VOD pages, try to get from the channel link
  const channelLink = document.querySelector('a[data-a-target="video-owner-link"]');
  if (channelLink) {
    const href = channelLink.getAttribute("href");
    if (href) {
      const vodMatch = href.match(/^\/([a-zA-Z0-9_]+)/);
      if (vodMatch?.[1]) {
        return vodMatch[1];
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
