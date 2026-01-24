import type { PageInfo } from "../core/twitch";
import {
  createRecord,
  deleteRecord,
  getCurrentStreamCached,
  getStreamerInfo,
  updateMemo,
} from "./messaging";
import { getPlayerTimestamp, getStreamerNameFromPage } from "./player";
import { showMemoInput, showToast } from "./ui";

let pendingRecordId: string | null = null;

export interface RecordHandlerDeps {
  getCurrentPageInfo: () => PageInfo;
  onRecordComplete: () => void;
}

export function createRecordHandler(deps: RecordHandlerDeps) {
  const { getCurrentPageInfo, onRecordComplete } = deps;

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
          onRecordComplete();
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
          onRecordComplete();
        },
      );
    } catch (error) {
      showToast("Failed to record moment", "error");
      console.error("[Twitch Clip Todo]", error);
    }
  }

  return { handleRecord };
}
