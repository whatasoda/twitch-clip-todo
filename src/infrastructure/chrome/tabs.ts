import type { ChromeTabsAPI } from "./types";

export function createTabsAPI(): ChromeTabsAPI {
  return {
    create(options) {
      return chrome.tabs.create(options);
    },
    query(queryInfo) {
      return chrome.tabs.query(queryInfo);
    },
  };
}
