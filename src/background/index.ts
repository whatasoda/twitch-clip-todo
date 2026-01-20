import { createChromeAPI } from "../infrastructure/chrome";
import { createTwitchApiClient, createTwitchAuthAPI } from "../infrastructure/twitch-api";
import {
  createCleanupService,
  createLinkingService,
  createRecordService,
  createTwitchService,
} from "../services";
import { TWITCH_CLIENT_ID } from "../shared/constants";
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
const twitchService =
  TWITCH_CLIENT_ID !== "__TWITCH_CLIENT_ID__"
    ? createTwitchService({ auth: twitchAuth, client: twitchClient })
    : null;

if (!twitchService) {
  console.warn(
    "[Twitch Clip Todo] Twitch API not configured. Set TWITCH_CLIENT_ID to enable API features.",
  );
}

// Initialize cleanup on startup
cleanupService.initialize();

// Message handler
chrome.runtime.onMessage.addListener((message: MessageToBackground, sender, sendResponse) => {
  // Handle OPEN_SIDE_PANEL separately as it needs sender.tab
  if (message.type === "OPEN_SIDE_PANEL" && sender.tab?.id) {
    chromeAPI.sidePanel
      .open({ tabId: sender.tab.id })
      .then(() => sendResponse({ success: true, data: null }))
      .catch((error) => sendResponse({ success: false, error: String(error) }));
    return true;
  }

  handleMessage(message, { recordService, linkingService, twitchService })
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

// Enable side panel to open when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // Ignore errors during initialization
});

console.log("[Twitch Clip Todo] Service Worker initialized");
