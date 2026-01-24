import { createChromeAPI } from "../infrastructure/chrome";
import { createTwitchApiClient, createTwitchAuthAPI } from "../infrastructure/twitch-api";
import {
  createCleanupService,
  createLinkingService,
  createRecordService,
  createTwitchService,
  createVodDiscoveryService,
} from "../services";
import type { MessageToBackground } from "../shared/types";
import { handleMessage } from "./message-handler";

// Initialize Chrome API
const chromeAPI = createChromeAPI();

// Create services with DI
const recordService = createRecordService({ storage: chromeAPI.storage });
const linkingService = createLinkingService({ recordService });
const cleanupService = createCleanupService({
  storage: chromeAPI.storage,
  alarms: chromeAPI.alarms,
});

// Initialize Twitch API services (only if CLIENT_ID is configured)
const twitchAuth = createTwitchAuthAPI();
const twitchClient = createTwitchApiClient({ auth: twitchAuth });
const twitchService = createTwitchService({
  auth: twitchAuth,
  client: twitchClient,
  storage: chromeAPI.storage,
});

if (!twitchService) {
  console.warn(
    "[Twitch Clip Todo] Twitch API not configured. Set TWITCH_CLIENT_ID to enable API features.",
  );
}

// Initialize VOD discovery service
const vodDiscoveryService = createVodDiscoveryService({
  recordService,
  linkingService,
  twitchService,
  alarms: chromeAPI.alarms,
});

// Initialize services on startup
cleanupService.initialize();
vodDiscoveryService.initialize();

// Message handler
chrome.runtime.onMessage.addListener((message: MessageToBackground, _sender, sendResponse) => {
  // Handle OPEN_POPUP
  if (message.type === "OPEN_POPUP") {
    chrome.action
      .openPopup()
      .then(() => sendResponse({ success: true, data: null }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to open popup",
        }),
      );
    return true;
  }

  handleMessage(message, { recordService, linkingService, twitchService, vodDiscoveryService })
    .then(sendResponse)
    .catch((error) =>
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  return true; // Keep channel open for async response
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "record-moment" && tab?.id && tab.url) {
    // Only send message if on Twitch
    if (tab.url.includes("twitch.tv")) {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_RECORD" }).catch(() => {
        // Content script not ready, ignore
      });
    }
  }
});

console.log("[Twitch Clip Todo] Service Worker initialized");
