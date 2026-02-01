import { logger } from "@/shared/logger";
import { getCurrentPageInfo, setupNavigationListener } from "./detector";
import { createPageHandler } from "./page-handler";
import { createRecordHandler } from "./record-handler";

function openPopup(): void {
  chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch((error) => {
    logger.error("Failed to open popup:", error);
  });
}

// Initialize handlers with dependencies
const recordHandler = createRecordHandler({
  getCurrentPageInfo,
  onRecordComplete: () =>
    pageHandler.refreshFloatingWidget(getCurrentPageInfo().streamerId ?? undefined),
  onOpenPopup: openPopup,
});

const pageHandler = createPageHandler({
  onRecord: recordHandler.handleRecord,
  onOpenPopup: openPopup,
  onPageChange: recordHandler.clearCache,
});

// Listen for keyboard shortcut trigger from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRIGGER_RECORD") {
    recordHandler.handleRecord();
  }
});

// Initialize
setupNavigationListener(pageHandler.handlePageChange);

logger.info("Content script initialized");
