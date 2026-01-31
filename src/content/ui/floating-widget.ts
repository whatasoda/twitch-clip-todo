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

class FloatingWidgetManager {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private onClick: (() => void) | null = null;

  private eventManager: EventManager | null = null;
  private draggable: DraggableBehavior | null = null;
  private autoHide: AutoHideBehavior | null = null;
  private positionPersistence: PositionPersistence;

  constructor() {
    this.positionPersistence = createPositionPersistence({
      storageKey: STORAGE_KEY,
      elementSize: { width: WIDGET_WIDTH, height: WIDGET_HEIGHT },
      defaultPosition: { x: window.innerWidth - 80, y: 100 },
    });
  }

  show(count: number, onClick: () => void): void {
    // Clean up existing widget
    this.hide();

    this.onClick = onClick;
    this.eventManager = createEventManager();

    const widget = this.createWidget(count);
    this.host = widget;

    // Set initial position
    const pos = this.positionPersistence.load();
    widget.style.cssText = `
      position: fixed;
      left: ${pos.x}px;
      top: ${pos.y}px;
      z-index: 10000;
    `;

    document.body.appendChild(widget);

    this.setupBehaviors();
  }

  hide(): void {
    this.autoHide?.destroy();
    this.draggable?.destroy();
    this.eventManager?.cleanup();

    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.onClick = null;
    this.eventManager = null;
    this.draggable = null;
    this.autoHide = null;
  }

  showError(onRetry: () => void): void {
    // Clean up existing widget
    this.hide();

    this.eventManager = createEventManager();

    const widget = this.createErrorWidget();
    this.host = widget;

    // Set initial position
    const pos = this.positionPersistence.load();
    widget.style.cssText = `
      position: fixed;
      left: ${pos.x}px;
      top: ${pos.y}px;
      z-index: 10000;
    `;

    document.body.appendChild(widget);

    this.setupErrorBehaviors(onRetry);
  }

  private createWidget(count: number): HTMLElement {
    const { host, shadow } = createShadowHost("twitch-clip-todo-floating-widget");
    this.shadow = shadow;

    // Inject CSS using Panda CSS tokens
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

    return host;
  }

  private setupBehaviors(): void {
    this.setupCommonBehaviors(() => this.onClick?.());
  }

  private setupCommonBehaviors(onClick: () => void): void {
    if (!this.host || !this.shadow || !this.eventManager) return;

    const button = this.shadow.querySelector("button");
    if (!button) return;

    // Setup draggable behavior
    this.draggable = createDraggable(
      {
        element: this.host,
        handle: button,
        threshold: 3,
        bounds: () => ({ width: window.innerWidth, height: window.innerHeight }),
        onDragStart: () => {
          button.classList.add("dragging");
          this.autoHide?.reset();
        },
        onDragEnd: () => {
          button.classList.remove("dragging");
          if (this.host) {
            this.positionPersistence.save(this.host.getBoundingClientRect());
          }
        },
        onDragCancel: () => {
          button.classList.remove("dragging");
        },
        onClick,
      },
      this.eventManager,
    );

    // Setup auto-hide behavior
    this.autoHide = createAutoHide(
      {
        delay: HIDE_DELAY_MS,
        isDragging: () => this.draggable?.isDragging ?? false,
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
      this.eventManager,
    );
  }

  private createErrorWidget(): HTMLElement {
    const { host, shadow } = createShadowHost("twitch-clip-todo-floating-widget");
    this.shadow = shadow;

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

    return host;
  }

  private setupErrorBehaviors(onRetry: () => void): void {
    this.setupCommonBehaviors(onRetry);
  }
}

// Singleton instance
const widgetManager = new FloatingWidgetManager();

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
