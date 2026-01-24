import { createShadowHost } from "./shadow-dom";
import { BOOKMARK_ICON_OUTLINED, styles } from "./styles";

let chatButtonElement: HTMLElement | null = null;
let retryTimeoutId: number | null = null;
let observer: MutationObserver | null = null;

function createChatButton(onClick: () => void): HTMLElement {
  const { host, shadow } = createShadowHost("twitch-clips-todo-chat-button");

  const button = document.createElement("button");
  button.setAttribute("style", styles.chatButton.base);
  button.setAttribute("aria-label", "Clip Later (Alt+Shift+C)");
  button.title = "Record moment (Alt+Shift+C)";
  button.innerHTML = BOOKMARK_ICON_OUTLINED;

  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(255, 255, 255, 0.15)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "transparent";
  });
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  shadow.appendChild(button);

  return host;
}

/**
 * Find the chat input buttons container closest to the send button.
 * Insert at the beginning of the right-side div (後ろの方の先頭).
 */
function findChatInputButtonsContainer(): HTMLElement | null {
  // Find all .chat-input__buttons-container elements
  const containers = document.querySelectorAll(".chat-input__buttons-container");
  // Get the last one (closest to send button)
  const container = containers[containers.length - 1];
  if (!container) return null;

  // Find child divs - we want the last div (right side)
  const childDivs = container.querySelectorAll(":scope > div");
  const lastDiv = childDivs[childDivs.length - 1];
  if (!lastDiv) return null;

  // Return the last div (後ろの方)
  return lastDiv as HTMLElement;
}

/**
 * Try to inject the button into chat input buttons area.
 * Returns true if successful.
 */
function tryInjectIntoChatInputButtons(buttonHost: HTMLElement): boolean {
  const targetDiv = findChatInputButtonsContainer();

  if (targetDiv) {
    // Insert at the beginning (先頭)
    targetDiv.insertBefore(buttonHost, targetDiv.firstChild);
    return true;
  }

  return false;
}

function attemptInjection(onClick: () => void): void {
  if (chatButtonElement) return;

  const button = createChatButton(onClick);
  chatButtonElement = button;

  // Try to inject into chat input buttons area
  if (!tryInjectIntoChatInputButtons(button)) {
    // If we couldn't inject, store the button but don't add it to DOM yet
    chatButtonElement = null;
  }
}

export function injectChatButton(onClick: () => void): void {
  // Clean up any previous retry attempts
  if (retryTimeoutId !== null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  // Try immediate injection
  attemptInjection(onClick);

  // If injection failed, set up observer to retry
  if (!chatButtonElement) {
    const button = createChatButton(onClick);

    observer = new MutationObserver(() => {
      if (chatButtonElement) return;

      // Check if injection target is now available
      const targetDiv = findChatInputButtonsContainer();

      if (targetDiv) {
        chatButtonElement = button;

        if (tryInjectIntoChatInputButtons(button)) {
          // Success - clean up observer
          observer?.disconnect();
          observer = null;
          return;
        }

        // If injection failed, reset
        chatButtonElement = null;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also retry with a timeout as backup
    retryTimeoutId = window.setTimeout(() => {
      if (chatButtonElement) return;

      chatButtonElement = button;

      if (!tryInjectIntoChatInputButtons(button)) {
        chatButtonElement = null;
      }

      // Clean up observer
      observer?.disconnect();
      observer = null;
    }, 2000);
  }
}

export function removeChatButton(): void {
  if (retryTimeoutId !== null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  chatButtonElement?.remove();
  chatButtonElement = null;
}
