import type { PageInfo } from "../core/twitch";
import { createRecord, deleteRecord, updateMemo } from "./messaging";
import {
  getBroadcastId,
  getLiveTimestamp,
  getStreamerWithFallback,
  getVodTimestamp,
} from "./providers";
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

    // Get timestamp and broadcastId using provider chain
    let timestamp: number | null = null;
    let broadcastId: string | null = null;

    if (pageInfo.type === "live" && loginFromUrl) {
      // Live: Get timestamp and broadcast ID from API with DOM fallback
      const [timestampResult, broadcastIdResult] = await Promise.all([
        getLiveTimestamp(loginFromUrl),
        getBroadcastId(loginFromUrl),
      ]);
      timestamp = timestampResult?.seconds ?? null;
      broadcastId = broadcastIdResult?.broadcastId ?? null;
    } else {
      // VOD: Get timestamp from DOM
      const timestampResult = await getVodTimestamp();
      timestamp = timestampResult?.seconds ?? null;
    }

    if (timestamp === null) {
      showToast("Could not get timestamp", "error");
      return;
    }

    // Get streamer info using provider chain
    const streamerResult = await getStreamerWithFallback(loginFromUrl);

    if (!streamerResult) {
      showToast("Could not get streamer name", "error");
      return;
    }

    try {
      const record = await createRecord({
        streamerId: loginFromUrl ?? streamerResult.login,
        streamerName: streamerResult.displayName,
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
