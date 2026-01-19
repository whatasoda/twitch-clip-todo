import { detectPage, type PageInfo } from "../core/twitch";

let currentPageInfo: PageInfo = { type: "other", streamerId: null, vodId: null };

export function getCurrentPageInfo(): PageInfo {
  return currentPageInfo;
}

export function updatePageInfo(): PageInfo {
  currentPageInfo = detectPage(window.location.href);
  return currentPageInfo;
}

export function setupNavigationListener(callback: (pageInfo: PageInfo) => void): void {
  // Initial detection
  const initial = updatePageInfo();
  callback(initial);

  // Listen for URL changes (Twitch is a SPA)
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const pageInfo = updatePageInfo();
      callback(pageInfo);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also listen for popstate (back/forward navigation)
  window.addEventListener("popstate", () => {
    const pageInfo = updatePageInfo();
    callback(pageInfo);
  });
}
