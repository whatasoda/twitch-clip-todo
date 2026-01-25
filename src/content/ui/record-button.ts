import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { createShadowHost } from "./shadow-dom";
import { BOOKMARK_ICON_OUTLINED, styles } from "./styles";

let buttonElement: HTMLElement | null = null;
let retryTimeoutId: number | null = null;
let observer: MutationObserver | null = null;

function createRecordButton(onClick: () => void): HTMLElement {
  const { host, shadow } = createShadowHost("twitch-clips-todo-button");

  const button = document.createElement("button");
  button.setAttribute("style", styles.playerButton.base);
  button.setAttribute("aria-label", t(MSG.BUTTON_CLIP_LATER_LABEL));
  button.title = t(MSG.BUTTON_RECORD_MOMENT_TITLE);
  button.innerHTML = `
    <span style="display: flex; align-items: center;">${BOOKMARK_ICON_OUTLINED}</span>
    <span>${t(MSG.BUTTON_CLIP_LATER)}</span>
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
 * Find Twitch's native clip button by its aria-label.
 * The label varies by locale (e.g., "Clip", "クリップ").
 */
function findClipButton(): HTMLButtonElement | null {
  const allButtons = document.querySelectorAll("button");
  return (
    (Array.from(allButtons).find((b) => {
      const label = b.getAttribute("aria-label") || "";
      // Match common locales for "Clip"
      return (
        label.includes("Clip") ||
        label.includes("クリップ") ||
        label.includes("클립") ||
        label.includes("Clipe")
      );
    }) as HTMLButtonElement | null) ?? null
  );
}

/**
 * Try to inject the button next to Twitch's clip button.
 * Returns true if successful.
 */
function tryInjectNextToClipButton(buttonHost: HTMLElement): boolean {
  const clipButton = findClipButton();

  if (clipButton) {
    // Navigate up to find the button wrapper (usually 2-3 levels up)
    let wrapper = clipButton.parentElement;

    // Find a suitable container that we can insert before
    // Twitch typically wraps buttons in div containers
    while (wrapper?.parentElement) {
      const parent = wrapper.parentElement;
      // Check if parent contains other button elements (indicating it's the button row)
      if (parent.children.length > 1) {
        // Insert our button before the clip button's wrapper
        parent.insertBefore(buttonHost, wrapper);
        return true;
      }
      wrapper = parent;
    }
  }

  return false;
}

/**
 * Fallback: inject into player controls area.
 */
function injectIntoPlayerControls(buttonHost: HTMLElement): boolean {
  const controlsBar = document.querySelector('[data-a-target="player-controls"]');
  if (controlsBar) {
    // Find the right side controls (where clip button lives)
    const rightControls = controlsBar.querySelector(
      '[class*="player-controls__right-control-group"]',
    );
    if (rightControls?.firstChild) {
      rightControls.insertBefore(buttonHost, rightControls.firstChild);
      return true;
    }
  }
  return false;
}

/**
 * Final fallback: fixed position on screen.
 */
function injectAsFixedPosition(buttonHost: HTMLElement): void {
  buttonHost.style.cssText = `
    position: fixed;
    bottom: 140px;
    right: 20px;
    z-index: 10000;
  `;
  document.body.appendChild(buttonHost);
}

function attemptInjection(onClick: () => void): void {
  if (buttonElement) return;

  const button = createRecordButton(onClick);
  buttonElement = button;

  // Try injection strategies in order
  if (tryInjectNextToClipButton(button)) {
    return;
  }

  if (injectIntoPlayerControls(button)) {
    return;
  }

  // Final fallback
  injectAsFixedPosition(button);
}

export function injectRecordButton(onClick: () => void): void {
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

  // If button was injected in fixed position (fallback), set up observer to retry
  const currentButton = buttonElement;
  if (currentButton && currentButton.style.position === "fixed") {
    // Set up mutation observer to detect when clip button becomes available
    observer = new MutationObserver(() => {
      const existingButton = buttonElement;
      if (!existingButton) return;

      // Check if we can now find the clip button
      const clipButton = findClipButton();
      if (clipButton) {
        // Remove the fixed position button
        buttonElement = null;
        existingButton.remove();

        // Re-attempt injection
        attemptInjection(onClick);

        // Clean up observer if successful - check the module-level variable
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
      btn.remove();
      attemptInjection(onClick);

      // Clean up observer
      observer?.disconnect();
      observer = null;
    }, 2000);
  }
}

export function removeRecordButton(): void {
  if (retryTimeoutId !== null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  buttonElement?.remove();
  buttonElement = null;
}
