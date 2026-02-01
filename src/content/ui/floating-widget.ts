import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import {
  type AutoHideBehavior,
  createAutoHide,
  createDraggable,
  createEventManager,
  createPositionPersistence,
  type DraggableBehavior,
  type EventManager,
  type PositionPersistence,
} from "../behaviors";
import { createShadowHost, injectStyles } from "./shadow-dom";
import { BOOKMARK_ICON_OUTLINED, RETRY_ICON } from "./styles";
import { getWidgetStyles } from "./widget.styles";

const STORAGE_KEY = "twitch-clip-todo-widget-position";
const HIDE_DELAY_MS = 2000;
const WIDGET_WIDTH = 60;
const WIDGET_HEIGHT = 40;

interface FloatingWidgetManager {
  show(count: number, onClick: () => void): void;
  hide(): void;
  showError(onRetry: () => void): void;
}

function createFloatingWidgetManager(): FloatingWidgetManager {
  const positionPersistence: PositionPersistence = createPositionPersistence({
    storageKey: STORAGE_KEY,
    elementSize: { width: WIDGET_WIDTH, height: WIDGET_HEIGHT },
    defaultPosition: { x: window.innerWidth - 80, y: 100 },
  });

  let host: HTMLElement | null = null;
  let shadow: ShadowRoot | null = null;
  let eventManager: EventManager | null = null;
  let draggable: DraggableBehavior | null = null;
  let autoHide: AutoHideBehavior | null = null;

  function createWidget(count: number): HTMLElement {
    const result = createShadowHost("twitch-clip-todo-floating-widget");
    shadow = result.shadow;

    injectStyles(shadow, getWidgetStyles());

    const button = document.createElement("button");
    button.className = "widget";
    button.setAttribute(
      "aria-label",
      count > 0 ? t(MSG.WIDGET_PENDING_CLIPS_LABEL, String(count)) : t(MSG.WIDGET_DEFAULT_LABEL),
    );
    button.title = t(MSG.WIDGET_TOOLTIP);
    button.innerHTML = `
      <span class="icon">${BOOKMARK_ICON_OUTLINED}</span>
      ${count > 0 ? `<span class="badge">${count}</span>` : ""}
    `;

    shadow.appendChild(button);

    return result.host;
  }

  function createErrorWidget(): HTMLElement {
    const result = createShadowHost("twitch-clip-todo-floating-widget");
    shadow = result.shadow;

    injectStyles(shadow, getWidgetStyles());

    const button = document.createElement("button");
    button.className = "widget error";
    button.setAttribute("aria-label", t(MSG.WIDGET_ERROR_LABEL));
    button.title = t(MSG.WIDGET_ERROR_TOOLTIP);
    button.innerHTML = `
      <span class="icon">${RETRY_ICON}</span>
      <span class="error-badge">!</span>
    `;

    shadow.appendChild(button);

    return result.host;
  }

  function setupCommonBehaviors(onClick: () => void): void {
    if (!host || !shadow || !eventManager) return;

    const button = shadow.querySelector("button");
    if (!button) return;

    draggable = createDraggable(
      {
        element: host,
        handle: button,
        threshold: 3,
        bounds: () => ({ width: window.innerWidth, height: window.innerHeight }),
        onDragStart: () => {
          button.classList.add("dragging");
          autoHide?.reset();
        },
        onDragEnd: () => {
          button.classList.remove("dragging");
          if (host) {
            positionPersistence.save(host.getBoundingClientRect());
          }
        },
        onDragCancel: () => {
          button.classList.remove("dragging");
        },
        onClick,
      },
      eventManager,
    );

    autoHide = createAutoHide(
      {
        delay: HIDE_DELAY_MS,
        isDragging: () => draggable?.isDragging ?? false,
        onHideStart: () => {
          button.classList.add("hiding");
        },
        onHidden: () => {
          button.classList.remove("hiding");
          button.classList.add("hidden");
        },
        onShow: () => {
          button.classList.remove("hidden", "hiding");
        },
      },
      eventManager,
    );
  }

  function applyPosition(element: HTMLElement): void {
    const pos = positionPersistence.load();
    element.style.cssText = `
      position: fixed;
      left: ${pos.x}px;
      top: ${pos.y}px;
      z-index: 10000;
    `;
  }

  function show(count: number, onClick: () => void): void {
    hide();

    eventManager = createEventManager();

    const widget = createWidget(count);
    host = widget;

    applyPosition(widget);
    document.body.appendChild(widget);

    setupCommonBehaviors(() => onClick());
  }

  function hide(): void {
    autoHide?.destroy();
    draggable?.destroy();
    eventManager?.cleanup();

    host?.remove();
    host = null;
    shadow = null;
    eventManager = null;
    draggable = null;
    autoHide = null;
  }

  function showError(onRetry: () => void): void {
    hide();

    eventManager = createEventManager();

    const widget = createErrorWidget();
    host = widget;

    applyPosition(widget);
    document.body.appendChild(widget);

    setupCommonBehaviors(onRetry);
  }

  return { show, hide, showError };
}

// Singleton instance
const widgetManager = createFloatingWidgetManager();

// Export functions that delegate to the manager (maintain existing API)
export function showFloatingWidget(count: number, onClick: () => void): void {
  widgetManager.show(count, onClick);
}

export function hideFloatingWidget(): void {
  widgetManager.hide();
}

export function showFloatingWidgetError(onRetry: () => void): void {
  widgetManager.showError(onRetry);
}
