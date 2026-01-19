import type { ChromeSidePanelAPI, SidePanelOpenOptions, SidePanelSetOptions } from "./types";

export function createSidePanelAPI(): ChromeSidePanelAPI {
  return {
    async open(options: SidePanelOpenOptions) {
      let windowId = options.windowId;

      // Chrome requires windowId, so we need to get it if not provided
      if (windowId === undefined) {
        if (options.tabId !== undefined) {
          const tab = await chrome.tabs.get(options.tabId);
          windowId = tab.windowId;
        }
        // Fallback: get current window
        if (windowId === undefined) {
          const window = await chrome.windows.getCurrent();
          windowId = window.id!;
        }
      }

      await chrome.sidePanel.open({ windowId, tabId: options.tabId });
    },
    setOptions(options: SidePanelSetOptions) {
      return chrome.sidePanel.setOptions(options);
    },
  };
}
