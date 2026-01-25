import type { EventManager } from "./event-manager";

export interface AutoHideOptions {
  delay?: number; // Default 3000ms
  isDragging?: () => boolean;
  onHideStart?: () => void;
  onHidden?: () => void;
  onShow?: () => void;
}

export interface AutoHideBehavior {
  readonly isHidden: boolean;
  reset(): void;
  destroy(): void;
}

export function createAutoHide(
  options: AutoHideOptions,
  eventManager: EventManager,
): AutoHideBehavior {
  const { delay = 3000, isDragging, onHideStart, onHidden, onShow } = options;

  let timeoutId: number | null = null;
  let isHidden = false;

  function handleMouseLeave(e: MouseEvent): void {
    // Only trigger when mouse actually leaves the document (relatedTarget is null)
    if (e.relatedTarget !== null) return;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      // Don't hide if currently dragging
      if (isDragging?.()) return;

      isHidden = true;
      onHideStart?.();

      // Delayed callback for when fully hidden
      setTimeout(() => {
        onHidden?.();
      }, 300);
    }, delay);
  }

  function handleMouseEnter(): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Don't re-show if auto-hidden
    if (isHidden) return;

    onShow?.();
  }

  // Bind events
  eventManager.bind({ target: document, event: "mouseout", handler: handleMouseLeave });
  eventManager.bind({ target: document, event: "mouseenter", handler: handleMouseEnter });

  return {
    get isHidden() {
      return isHidden;
    },
    reset() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isHidden = false;
    },
    destroy() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // Note: document events are cleaned up via eventManager.cleanup()
    },
  };
}
