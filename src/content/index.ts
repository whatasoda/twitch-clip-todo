import type { PageInfo } from "../core/twitch";
import { getCurrentPageInfo, setupNavigationListener } from "./detector";
import {
  createRecord,
  deleteRecord,
  getCurrentStream,
  getPendingCount,
  getStreamerInfo,
  getVodMetadataFromApi,
  linkVod,
  updateMemo,
} from "./messaging";
import { getPlayerTimestamp, getStreamerNameFromPage, getVodMetadata } from "./player";
import {
  hideIndicator,
  hideMemoInput,
  injectChatButton,
  injectRecordButton,
  removeChatButton,
  removeRecordButton,
  showIndicator,
  showMemoInput,
  showToast,
} from "./ui";

let pendingRecordId: string | null = null;

async function handleRecord(): Promise<void> {
  const pageInfo = getCurrentPageInfo();
  if (pageInfo.type !== "live" && pageInfo.type !== "vod") {
    showToast("Can only record on stream or VOD pages", "error");
    return;
  }

  const loginFromUrl = pageInfo.streamerId;

  // Get timestamp and broadcastId - different strategies for live vs VOD
  let timestamp: number | null = null;
  let broadcastId: string | null = null;

  if (pageInfo.type === "live" && loginFromUrl) {
    // Live: Calculate elapsed time from API's started_at and capture broadcastId
    try {
      const streamInfo = await getCurrentStream(loginFromUrl);
      if (streamInfo) {
        broadcastId = streamInfo.streamId;
        if (streamInfo.startedAt) {
          const elapsedMs = Date.now() - new Date(streamInfo.startedAt).getTime();
          timestamp = Math.floor(elapsedMs / 1000);
        }
      }
    } catch {
      // API failed, will try DOM fallback
    }
  }

  // DOM fallback (primary method for VOD, fallback for live)
  if (timestamp === null) {
    timestamp = getPlayerTimestamp();
  }

  if (timestamp === null) {
    showToast("Could not get timestamp", "error");
    return;
  }

  // Try to get streamer name from API first, then fallback to DOM
  let streamerName: string | null = null;

  if (loginFromUrl) {
    try {
      const apiInfo = await getStreamerInfo(loginFromUrl);
      if (apiInfo) {
        streamerName = apiInfo.displayName;
      }
    } catch {
      // API failed, will use DOM fallback
    }
  }

  // DOM fallback
  if (!streamerName) {
    streamerName = getStreamerNameFromPage();
  }

  if (!streamerName) {
    showToast("Could not get streamer name", "error");
    return;
  }

  try {
    const record = await createRecord({
      streamerId: loginFromUrl ?? streamerName.toLowerCase(),
      streamerName,
      timestampSeconds: timestamp,
      sourceType: pageInfo.type as "live" | "vod",
      vodId: pageInfo.vodId,
      broadcastId,
    });

    pendingRecordId = record.id;
    showMemoInput(
      async (memo) => {
        if (memo && pendingRecordId) {
          await updateMemo(pendingRecordId, memo);
        }
        showToast("Moment recorded!", "success");
        pendingRecordId = null;
        refreshIndicator();
      },
      async () => {
        // Cancel: Delete the pending record
        if (pendingRecordId) {
          try {
            await deleteRecord(pendingRecordId);
            showToast("Recording cancelled", "info");
          } catch (error) {
            console.error("[Twitch Clip Todo] Failed to delete record:", error);
            showToast("Failed to cancel recording", "error");
          }
        }
        pendingRecordId = null;
        refreshIndicator();
      },
    );
  } catch (error) {
    showToast("Failed to record moment", "error");
    console.error("[Twitch Clip Todo]", error);
  }
}

async function refreshIndicator(): Promise<void> {
  const pageInfo = getCurrentPageInfo();
  if (!pageInfo.streamerId) return;

  // Don't show indicator during live/VOD viewing
  if (pageInfo.type === "live" || pageInfo.type === "vod") {
    return;
  }

  try {
    const count = await getPendingCount(pageInfo.streamerId);
    if (count > 0) {
      showIndicator(count);
    } else {
      hideIndicator();
    }
  } catch (error) {
    console.error("[Twitch Clip Todo] Failed to refresh indicator:", error);
  }
}

async function handlePageChange(pageInfo: PageInfo): Promise<void> {
  // Clean up UI
  removeRecordButton();
  removeChatButton();
  hideIndicator();
  hideMemoInput();

  if (pageInfo.type === "live" || pageInfo.type === "vod") {
    // Inject record buttons - NO indicator during viewing
    injectRecordButton(handleRecord);
    injectChatButton(handleRecord);

    // Auto-link VODs
    if (pageInfo.type === "vod" && pageInfo.vodId) {
      try {
        // Try to get VOD metadata from API first
        let vodId = pageInfo.vodId;
        let streamerId: string | null = null;
        let startedAt: string | null = null;
        let durationSeconds: number | null = null;

        const apiVodMeta = await getVodMetadataFromApi(pageInfo.vodId);
        if (apiVodMeta) {
          vodId = apiVodMeta.vodId;
          streamerId = apiVodMeta.streamerId;
          startedAt = apiVodMeta.startedAt.toISOString();
          durationSeconds = apiVodMeta.durationSeconds;
        } else {
          // Fallback to DOM extraction
          const domVodMeta = getVodMetadata();
          if (domVodMeta) {
            vodId = domVodMeta.vodId;
            streamerId = domVodMeta.streamerId;
            startedAt = domVodMeta.startedAt;
            durationSeconds = domVodMeta.durationSeconds;
          }
        }

        if (streamerId) {
          const linked = await linkVod({
            vodId,
            streamerId,
            startedAt: startedAt ?? new Date().toISOString(),
            durationSeconds: durationSeconds ?? 0,
          });
          if (linked.length > 0) {
            showToast(`Linked ${linked.length} record(s) to this VOD`, "info");
          }
        }
      } catch (error) {
        console.error("[Twitch Clip Todo] VOD linking failed:", error);
      }
    }
  } else if (pageInfo.type === "channel" && pageInfo.streamerId) {
    // Show indicator on channel pages
    try {
      const count = await getPendingCount(pageInfo.streamerId);
      if (count > 0) {
        showIndicator(count);
      }
    } catch (error) {
      console.error("[Twitch Clip Todo] Failed to get pending count:", error);
    }
  }
}

// Listen for keyboard shortcut trigger from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRIGGER_RECORD") {
    handleRecord();
  }
});

// Initialize
setupNavigationListener(handlePageChange);

console.log("[Twitch Clip Todo] Content script initialized");
