import { createSignal, onCleanup, onMount } from "solid-js";
import { detectPage, type PageInfo } from "../../core/twitch";

export function useCurrentTab() {
  const [pageInfo, setPageInfo] = createSignal<PageInfo>({
    type: "other",
    streamerId: null,
    vodId: null,
  });
  const [tabUrl, setTabUrl] = createSignal<string>("");

  async function updateCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      setTabUrl(tab.url);
      setPageInfo(detectPage(tab.url));
    }
  }

  onMount(() => {
    updateCurrentTab();

    // Listen for tab changes
    const activatedListener = () => updateCurrentTab();
    const updatedListener = (
      _tabId: number,
      changeInfo: { url?: string; status?: string },
      _tab: chrome.tabs.Tab,
    ) => {
      if (changeInfo.url || changeInfo.status === "complete") {
        updateCurrentTab();
      }
    };

    chrome.tabs.onActivated.addListener(activatedListener);
    chrome.tabs.onUpdated.addListener(updatedListener);

    onCleanup(() => {
      chrome.tabs.onActivated.removeListener(activatedListener);
      chrome.tabs.onUpdated.removeListener(updatedListener);
    });
  });

  return {
    pageInfo,
    tabUrl,
    isOnTwitch: () => pageInfo().type !== "other",
    currentStreamerId: () => pageInfo().streamerId,
  };
}
