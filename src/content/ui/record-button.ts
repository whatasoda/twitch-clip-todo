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
 * Known aria-label substrings for Twitch's native clip button across locales.
 * Uses substring matching (includes), so "Clip" covers en, es, fr, de, it, etc.
 * Add new entries only for languages where the label does not contain an existing entry.
 */
const CLIP_BUTTON_LABELS = [
  "Clip", // en, es, fr, de, it, nl, and other Latin-script locales
  "クリップ", // ja
  "클립", // ko
  "Clipe", // pt, pt-BR
  "Klip", // tr, cs, sk
  "Клип", // ru, uk
  "คลิป", // th
  "剪辑", // zh-CN
  "剪輯", // zh-TW
];

/**
 * Find Twitch's native clip button by its aria-label.
 * The label varies by locale (e.g., "Clip", "クリップ").
 */
function findClipButton(): HTMLButtonElement | null {
  const allButtons = document.querySelectorAll("button");
  return (
    (Array.from(allButtons).find((b) => {
      const label = b.getAttribute("aria-label") || "";
      return CLIP_BUTTON_LABELS.some((l) => label.includes(l));
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
 * Primary: inject into player controls area using stable data-a-target selector.
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

/**
 * Check whether the button is currently placed adjacent to the clip button.
 */
function isAdjacentToClipButton(): boolean {
  if (!buttonElement) return false;
  const clipButton = findClipButton();
  if (!clipButton) return false;
  // They share the same grandparent when adjacent
  return buttonElement.parentElement === clipButton.parentElement?.parentElement?.parentElement;
}

function attemptInjection(onClick: () => void): void {
  if (buttonElement) return;

  const button = createRecordButton(onClick);
  buttonElement = button;

  // Try injection strategies in order of selector stability
  // 1. Player controls (most stable — uses data-a-target)
  if (injectIntoPlayerControls(button)) {
    return;
  }

  // 2. Next to clip button (best UX position — uses aria-label)
  if (tryInjectNextToClipButton(button)) {
    return;
  }

  // 3. Fixed position fallback
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

  // If not adjacent to clip button, set up observer to attempt upgrade
  if (buttonElement && !isAdjacentToClipButton()) {
    observer = new MutationObserver(() => {
      const existingButton = buttonElement;
      if (!existingButton) return;

      // Try to upgrade to clip-adjacent position
      const clipButton = findClipButton();
      if (!clipButton) return;

      buttonElement = null;
      existingButton.remove();
      attemptInjection(onClick);

      // If we achieved clip-adjacent or at least non-fixed, stop observing
      // buttonElement is reassigned by attemptInjection above
      const newButton = buttonElement as HTMLElement | null;
      if (newButton && (isAdjacentToClipButton() || newButton.style.position !== "fixed")) {
        observer?.disconnect();
        observer = null;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout backup: one more attempt then stop observing
    retryTimeoutId = window.setTimeout(() => {
      const btn = buttonElement;
      if (!btn) return;

      // If still in fixed position, try one more time
      if (btn.style.position === "fixed") {
        buttonElement = null;
        btn.remove();
        attemptInjection(onClick);
      }

      // Clean up observer regardless
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
