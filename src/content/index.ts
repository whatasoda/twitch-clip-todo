import type { PageInfo } from "../core/twitch";
import { getCurrentPageInfo, setupNavigationListener } from "./detector";
import {
  createRecord,
  deleteRecord,
  getCurrentStreamCached,
  getPendingCount,
  getStreamerInfo,
  getVodMetadataFromApi,
  linkVod,
  updateMemo,
} from "./messaging";
import { getPlayerTimestamp, getStreamerNameFromPage } from "./player";
import {
  hideFloatingWidget,
  hideMemoInput,
  injectChatButton,
  injectRecordButton,
  removeChatButton,
  removeRecordButton,
  showFloatingWidget,
  showMemoInput,
  showToast,
  updateFloatingWidgetCount,
} from "./ui";

let pendingRecordId: string | null = null;

function openPopup(): void {
  chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch((error) => {
    console.error("[Twitch Clip Todo] Failed to open popup:", error);
  });
}

async function handleRecord(): Promise<void> {
  const pageInfo = getCurrentPageInfo();
  if (pageInfo.type !== "live" && pageInfo.type !== "vod") {
    showToast("現在は利用できません。チャンネルページから保存済みのTODOを確認できます。", "info");
    return;
  }

  const loginFromUrl = pageInfo.streamerId;

  // Get timestamp and broadcastId - different strategies for live vs VOD
  let timestamp: number | null = null;
  let broadcastId: string | null = null;

  if (pageInfo.type === "live" && loginFromUrl) {
    // Live: Calculate elapsed time from API's started_at and capture broadcastId
    try {
      const streamInfo = await getCurrentStreamCached(loginFromUrl);
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
        refreshFloatingWidget();
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
        refreshFloatingWidget();
      },
    );
  } catch (error) {
    showToast("Failed to record moment", "error");
    console.error("[Twitch Clip Todo]", error);
  }
}

async function refreshFloatingWidget(): Promise<void> {
  const pageInfo = getCurrentPageInfo();
  if (!pageInfo.streamerId) return;

  try {
    const count = await getPendingCount(pageInfo.streamerId);
    updateFloatingWidgetCount(count);
  } catch (error) {
    console.error("[Twitch Clip Todo] Failed to refresh floating widget:", error);
  }
}

async function handlePageChange(pageInfo: PageInfo): Promise<void> {
  // Clean up UI
  removeRecordButton();
  removeChatButton();
  hideFloatingWidget();
  hideMemoInput();

  if (pageInfo.type === "live" || pageInfo.type === "vod") {
    // Inject record buttons
    injectRecordButton(handleRecord);
    injectChatButton(handleRecord);

    // Auto-link VODs (requires API for streamerId)
    if (pageInfo.type === "vod" && pageInfo.vodId) {
      try {
        const apiVodMeta = await getVodMetadataFromApi(pageInfo.vodId);

        if (apiVodMeta?.streamId) {
          const linked = await linkVod({
            vodId: apiVodMeta.vodId,
            streamerId: apiVodMeta.streamerId,
            streamId: apiVodMeta.streamId,
            startedAt: apiVodMeta.startedAt,
            durationSeconds: apiVodMeta.durationSeconds,
          });
          if (linked.length > 0) {
            showToast(`Linked ${linked.length} record(s) to this VOD`, "info");
          }
        }

        // Show floating widget for VOD using API-fetched streamerId
        if (apiVodMeta?.streamerId) {
          const count = await getPendingCount(apiVodMeta.streamerId);
          showFloatingWidget(count, openPopup);
        }
      } catch (error) {
        console.error("[Twitch Clip Todo] VOD linking failed:", error);
      }
    }
  }

  // Show floating widget for non-VOD pages (live, channel)
  if (pageInfo.type !== "vod" && pageInfo.streamerId) {
    try {
      const count = await getPendingCount(pageInfo.streamerId);
      showFloatingWidget(count, openPopup);
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
