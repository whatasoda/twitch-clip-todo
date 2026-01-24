import { BOOKMARK_ICON_OUTLINED, styles } from "./styles";

let buttonElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let retryTimeoutId: number | null = null;
let observer: MutationObserver | null = null;

function createChannelButton(count: number, onClick: () => void): HTMLElement {
  const host = document.createElement("div");
  host.id = "twitch-clips-todo-channel-button";
  const shadow = host.attachShadow({ mode: "closed" });
  shadowRoot = shadow;

  const button = document.createElement("button");
  button.setAttribute("style", styles.channelButton.base);
  button.setAttribute("aria-label", `${count} pending clips - Click to open side panel`);
  button.title = "Open Clip Todo panel";
  button.innerHTML = `
    <span style="display: flex; align-items: center;">${BOOKMARK_ICON_OUTLINED}</span>
    <span style="${styles.channelButton.badge}">${count}</span>
  `;

  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(255, 255, 255, 0.25)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "rgba(255, 255, 255, 0.15)";
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
 * Find the container that holds follow/subscribe buttons.
 * Strategy: Find the follow button and traverse up to find the button group container.
 */
function findButtonContainer(): HTMLElement | null {
  const followButton = document.querySelector('button[data-a-target="follow-button"]');
  if (!followButton) return null;

  // Traverse up to find the container that holds multiple button groups
  // Based on DOM analysis: the container is about 10 levels up from the follow button
  let current: HTMLElement | null = followButton as HTMLElement;
  for (let i = 0; i < 10; i++) {
    current = current.parentElement;
    if (!current) return null;
  }

  // Verify this is the right container by checking it has multiple children
  // and contains button elements
  if (current.children.length >= 2) {
    const buttons = current.querySelectorAll("button");
    if (buttons.length >= 3) {
      return current;
    }
  }

  return null;
}

/**
 * Try to inject the button into the channel header.
 * Returns true if successful.
 */
function tryInjectIntoHeader(buttonHost: HTMLElement): boolean {
  const container = findButtonContainer();
  if (!container) return false;

  // Create a wrapper div to match Twitch's structure
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display: flex; align-items: center; margin-left: 10px;";
  wrapper.appendChild(buttonHost);

  // Append to the end of the container
  container.appendChild(wrapper);
  return true;
}

/**
 * Fallback: fixed position on screen.
 */
function injectAsFixedPosition(buttonHost: HTMLElement): void {
  buttonHost.style.cssText = `
    position: fixed;
    top: 120px;
    right: 20px;
    z-index: 10000;
  `;
  document.body.appendChild(buttonHost);
}

function attemptInjection(count: number, onClick: () => void): void {
  if (buttonElement) return;

  const button = createChannelButton(count, onClick);
  buttonElement = button;

  if (tryInjectIntoHeader(button)) {
    return;
  }

  // Fallback to fixed position
  injectAsFixedPosition(button);
}

export function injectChannelButton(count: number, onClick: () => void): void {
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
  attemptInjection(count, onClick);

  // If button was injected in fixed position (fallback), set up observer to retry
  const currentButton = buttonElement;
  if (currentButton && currentButton.style.position === "fixed") {
    observer = new MutationObserver(() => {
      const existingButton = buttonElement;
      if (!existingButton) return;

      // Check if we can now find the button container
      const container = findButtonContainer();
      if (container) {
        // Remove the fixed position button
        buttonElement = null;
        shadowRoot = null;
        existingButton.remove();

        // Re-attempt injection
        attemptInjection(count, onClick);

        // Clean up observer if successful
        if (buttonElement && (buttonElement as HTMLElement).style.position !== "fixed") {
          observer?.disconnect();
          observer = null;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also retry with a timeout as backup
    retryTimeoutId = window.setTimeout(() => {
      const btn = buttonElement;
      if (!btn || btn.style.position !== "fixed") {
        return;
      }

      // One more attempt
      buttonElement = null;
      shadowRoot = null;
      btn.remove();
      attemptInjection(count, onClick);

      // Clean up observer
      observer?.disconnect();
      observer = null;
    }, 2000);
  }
}

export function removeChannelButton(): void {
  if (retryTimeoutId !== null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // Also remove parent wrapper if it exists
  const parent = buttonElement?.parentElement;
  if (parent && parent.children.length === 1) {
    parent.remove();
  } else {
    buttonElement?.remove();
  }
  buttonElement = null;
  shadowRoot = null;
}

export function updateChannelButtonCount(count: number): void {
  if (!shadowRoot) return;

  const badge = shadowRoot.querySelector("button > span:last-child") as HTMLElement;
  if (badge) {
    badge.textContent = String(count);
  }

  const button = shadowRoot.querySelector("button");
  if (button) {
    button.setAttribute("aria-label", `${count} pending clips - Click to open side panel`);
  }
}
