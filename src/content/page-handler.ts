import type { PageInfo } from "../core/twitch";
import { getPendingCount, getVodMetadataFromApi, linkVod } from "./messaging";
import {
  hideFloatingWidget,
  hideMemoInput,
  injectChatButton,
  injectRecordButton,
  removeChatButton,
  removeRecordButton,
  showFloatingWidget,
  showFloatingWidgetError,
  showToast,
} from "./ui";

export interface PageHandlerDeps {
  onRecord: () => Promise<void>;
  onOpenPopup: () => void;
}

export function createPageHandler(deps: PageHandlerDeps) {
  const { onRecord, onOpenPopup } = deps;

  async function handlePageChange(pageInfo: PageInfo): Promise<void> {
    // Clean up UI
    removeRecordButton();
    removeChatButton();
    hideFloatingWidget();
    hideMemoInput();

    if (pageInfo.type === "live" || pageInfo.type === "vod") {
      // Inject record buttons
      injectRecordButton(onRecord);
      injectChatButton(onRecord);

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
            const streamerId = apiVodMeta.streamerId;

            const tryShowVodWidget = async (): Promise<void> => {
              try {
                const count = await getPendingCount(streamerId);
                showFloatingWidget(count, onOpenPopup);
              } catch (err) {
                console.error("[Twitch Clip Todo] Failed to get pending count for VOD:", err);
                showFloatingWidgetError(tryShowVodWidget);
              }
            };

            tryShowVodWidget();
          }
        } catch (error) {
          console.error("[Twitch Clip Todo] VOD linking failed:", error);
        }
      }
    }

    // Show floating widget for non-VOD pages (live, channel)
    if (pageInfo.type !== "vod" && pageInfo.streamerId) {
      const streamerId = pageInfo.streamerId;

      const tryShowWidget = async (): Promise<void> => {
        try {
          const count = await getPendingCount(streamerId);
          showFloatingWidget(count, onOpenPopup);
        } catch (error) {
          console.error("[Twitch Clip Todo] Failed to get pending count:", error);
          showFloatingWidgetError(tryShowWidget);
        }
      };

      tryShowWidget();
    }
  }

  async function refreshFloatingWidget(streamerId: string | undefined): Promise<void> {
    if (!streamerId) return;

    const tryRefresh = async (): Promise<void> => {
      try {
        const count = await getPendingCount(streamerId);
        showFloatingWidget(count, onOpenPopup);
      } catch (error) {
        console.error("[Twitch Clip Todo] Failed to refresh floating widget:", error);
        showFloatingWidgetError(tryRefresh);
      }
    };

    tryRefresh();
  }

  return { handlePageChange, refreshFloatingWidget };
}
