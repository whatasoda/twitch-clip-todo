import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { logger } from "@/shared/logger";
import type { PageInfo } from "../core/twitch";
import type { CreateRecordPayload } from "../shared/types";
import { checkAuthStatus, createRecord, getVodMetadataFromApi } from "./messaging";
import {
  getBroadcastId,
  getLiveTimestamp,
  getStreamerWithFallback,
  getVodTimestamp,
  type StreamerResult,
} from "./providers";
import { showMemoInput, showToast } from "./ui";

export interface RecordHandlerDeps {
  getCurrentPageInfo: () => PageInfo;
  onRecordComplete: () => void;
  onOpenPopup: () => void;
}

export function createRecordHandler(deps: RecordHandlerDeps) {
  const { getCurrentPageInfo, onRecordComplete, onOpenPopup } = deps;

  // Page-level caches (cleared on page navigation via onRecordComplete's parent)
  let cachedLoginFromUrl: string | null = null;
  let cachedStreamerResult: StreamerResult | null = null;
  // undefined = not yet cached, null = cached as no broadcast ID
  let cachedBroadcastId: string | null | undefined;

  function clearCache(): void {
    cachedLoginFromUrl = null;
    cachedStreamerResult = null;
    cachedBroadcastId = undefined;
  }

  async function handleRecord(): Promise<void> {
    const { isAuthenticated } = await checkAuthStatus();
    if (!isAuthenticated) {
      showToast(t(MSG.TOAST_AUTH_REQUIRED), "info");
      onOpenPopup();
      return;
    }

    const pageInfo = getCurrentPageInfo();
    if (pageInfo.type !== "live" && pageInfo.type !== "vod") {
      showToast(t(MSG.TOAST_NOT_AVAILABLE), "info");
      return;
    }

    const loginFromUrl = pageInfo.streamerId;

    // Start data fetching immediately (runs in parallel with memo input)
    const dataPromise = fetchRecordData(pageInfo, loginFromUrl);

    // Show memo input immediately; save button is disabled until data is ready
    showMemoInput(
      async (memo) => {
        try {
          const data = await dataPromise;
          await createRecord({ ...data, memo });
          showToast(t(MSG.TOAST_MOMENT_RECORDED), "success");
          onRecordComplete();
        } catch (error) {
          showToast(t(MSG.TOAST_RECORD_FAILED), "error");
          logger.error("Record creation failed:", error);
        }
      },
      () => {
        // Cancel: nothing to clean up since no record was created yet
      },
      dataPromise.then(() => {}),
    );
  }

  async function fetchRecordData(
    pageInfo: PageInfo,
    loginFromUrl: string | null,
  ): Promise<CreateRecordPayload> {
    // Invalidate cache if streamer changed
    if (cachedLoginFromUrl !== null && cachedLoginFromUrl !== loginFromUrl) {
      clearCache();
    }
    cachedLoginFromUrl = loginFromUrl;

    // Get timestamp and broadcastId using provider chain
    let timestamp: number | null = null;
    let broadcastId: string | null = null;

    if (pageInfo.type === "live" && loginFromUrl) {
      // Live: Get timestamp and broadcast ID from API with DOM fallback
      const broadcastIdPromise =
        cachedBroadcastId !== undefined
          ? Promise.resolve(cachedBroadcastId)
          : getBroadcastId(loginFromUrl).then((r) => {
              cachedBroadcastId = r?.broadcastId ?? null;
              return cachedBroadcastId;
            });

      const [timestampResult, broadcastIdResult] = await Promise.all([
        getLiveTimestamp(loginFromUrl),
        broadcastIdPromise,
      ]);
      timestamp = timestampResult?.seconds ?? null;
      broadcastId = broadcastIdResult;
    } else {
      // VOD: Get timestamp from DOM and metadata from API in parallel
      const [timestampResult, vodMetadata] = await Promise.all([
        getVodTimestamp(),
        pageInfo.vodId ? getVodMetadataFromApi(pageInfo.vodId) : Promise.resolve(null),
      ]);
      timestamp = timestampResult?.seconds ?? null;

      if (vodMetadata) {
        cachedStreamerResult = {
          displayName: vodMetadata.streamerName,
          login: vodMetadata.streamerId,
        };
        broadcastId = vodMetadata.streamId;
      }
    }

    if (timestamp === null) {
      throw new Error(t(MSG.TOAST_NO_TIMESTAMP));
    }

    // Get streamer info using provider chain (with cache)
    let streamerResult = cachedStreamerResult;
    if (!streamerResult) {
      streamerResult = await getStreamerWithFallback(loginFromUrl);
      if (streamerResult) {
        cachedStreamerResult = streamerResult;
      }
    }

    if (!streamerResult) {
      throw new Error(t(MSG.TOAST_NO_STREAMER_NAME));
    }

    return {
      streamerId: loginFromUrl ?? streamerResult.login,
      streamerName: streamerResult.displayName,
      timestampSeconds: timestamp,
      sourceType: pageInfo.type as "live" | "vod",
      vodId: pageInfo.vodId,
      broadcastId,
    };
  }

  return { handleRecord, clearCache };
}
