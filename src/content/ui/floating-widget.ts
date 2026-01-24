import { BOOKMARK_ICON_OUTLINED } from "./styles";
import widgetStyles from "./floating-widget.css?raw";

const STORAGE_KEY = "twitch-clip-todo-widget-position";
const HIDE_DELAY_MS = 3000;
const WIDGET_WIDTH = 60;
const WIDGET_HEIGHT = 40;

interface WidgetPosition {
  horizontal: "left" | "right";
  horizontalOffset: number;
  vertical: "top" | "bottom";
  verticalOffset: number;
}

let widgetElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let hideTimeoutId: number | null = null;
let isDragging = false;
let didDrag = false; // True if mouse actually moved during drag
let dragStartPos = { x: 0, y: 0 };
let widgetStartPos = { x: 0, y: 0 };
let currentOnClick: (() => void) | null = null;
let isAutoHidden = false; // True after auto-hide, prevents re-show on mouseenter

// Event handler references for cleanup
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let mouseUpHandler: (() => void) | null = null;
let mouseLeaveHandler: ((e: MouseEvent) => void) | null = null;
let mouseEnterHandler: ((e: MouseEvent) => void) | null = null;

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const pos: WidgetPosition = JSON.parse(saved);
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Convert edge-based offset to absolute coordinates
      const x =
        pos.horizontal === "left"
          ? pos.horizontalOffset
          : vw - pos.horizontalOffset - WIDGET_WIDTH;
      const y =
        pos.vertical === "top"
          ? pos.verticalOffset
          : vh - pos.verticalOffset - WIDGET_HEIGHT;

      return {
        x: Math.max(0, Math.min(x, vw - WIDGET_WIDTH)),
        y: Math.max(0, Math.min(y, vh - WIDGET_HEIGHT)),
      };
    }
  } catch {
    // Ignore parse errors or old format
  }
  // Default: top-right area
  return { x: window.innerWidth - 80, y: 100 };
}

function savePosition(rect: DOMRect): void {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Determine which edge is closer
    const pos: WidgetPosition = {
      horizontal: rect.left < vw - rect.right ? "left" : "right",
      horizontalOffset:
        rect.left < vw - rect.right ? rect.left : vw - rect.right,
      vertical: rect.top < vh - rect.bottom ? "top" : "bottom",
      verticalOffset: rect.top < vh - rect.bottom ? rect.top : vh - rect.bottom,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Ignore storage errors
  }
}

function createWidget(count: number): HTMLElement {
  const host = document.createElement("div");
  host.id = "twitch-clip-todo-floating-widget";

  const shadow = host.attachShadow({ mode: "closed" });
  shadowRoot = shadow;

  // Inject CSS from file
  const style = document.createElement("style");
  style.textContent = widgetStyles;
  shadow.appendChild(style);

  const button = document.createElement("button");
  button.className = "widget";
  button.setAttribute(
    "aria-label",
    count > 0 ? `${count} pending clips - Click to open popup` : "Clip Todo - Click to open popup",
  );
  button.title = "Click to open Clip Todo panel\nDrag to move";
  button.innerHTML = `
    <span class="icon">${BOOKMARK_ICON_OUTLINED}</span>
    ${count > 0 ? `<span class="badge">${count}</span>` : ""}
  `;

  // Drag start
  button.addEventListener("mousedown", (e) => {
    isDragging = true;
    didDrag = false;
    dragStartPos = { x: e.clientX, y: e.clientY };
    const rect = host.getBoundingClientRect();
    widgetStartPos = { x: rect.left, y: rect.top };
    button.classList.add("dragging");
  });

  // Click (only if not dragging)
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    // Only trigger click if we didn't actually drag
    if (!didDrag && currentOnClick) {
      currentOnClick();
    }
  });

  shadow.appendChild(button);

  return host;
}

function setupDragHandlers(): void {
  mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging || !widgetElement) return;

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    // Mark as dragged if moved more than 3 pixels
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      didDrag = true;
    }

    let newX = widgetStartPos.x + deltaX;
    let newY = widgetStartPos.y + deltaY;

    // Keep within viewport
    newX = Math.max(0, Math.min(newX, window.innerWidth - 60));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 40));

    widgetElement.style.left = `${newX}px`;
    widgetElement.style.top = `${newY}px`;
  };

  mouseUpHandler = () => {
    if (isDragging && widgetElement) {
      isDragging = false;
      const button = shadowRoot?.querySelector("button");
      if (button) {
        button.classList.remove("dragging");
      }
      // Save position using edge-based logic
      savePosition(widgetElement.getBoundingClientRect());
    }
  };

  document.addEventListener("mousemove", mouseMoveHandler);
  document.addEventListener("mouseup", mouseUpHandler);
}

function setupAutoHide(): void {
  // Use mouseout with relatedTarget check for reliable detection
  mouseLeaveHandler = (e: MouseEvent) => {
    // Only trigger when mouse actually leaves the document (relatedTarget is null)
    if (e.relatedTarget !== null) return;

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    hideTimeoutId = window.setTimeout(() => {
      const button = shadowRoot?.querySelector("button");
      if (button && !isDragging) {
        isAutoHidden = true; // Mark as auto-hidden immediately
        button.classList.add("hiding");
        setTimeout(() => {
          button.classList.remove("hiding");
          button.classList.add("hidden");
        }, 300);
      }
    }, HIDE_DELAY_MS);
  };

  mouseEnterHandler = () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    // Don't re-show if auto-hidden
    if (isAutoHidden) return;

    const button = shadowRoot?.querySelector("button");
    if (button) {
      button.classList.remove("hidden", "hiding");
    }
  };

  document.addEventListener("mouseout", mouseLeaveHandler);
  document.addEventListener("mouseenter", mouseEnterHandler);
}

function cleanupEventListeners(): void {
  if (mouseMoveHandler) {
    document.removeEventListener("mousemove", mouseMoveHandler);
    mouseMoveHandler = null;
  }
  if (mouseUpHandler) {
    document.removeEventListener("mouseup", mouseUpHandler);
    mouseUpHandler = null;
  }
  if (mouseLeaveHandler) {
    document.removeEventListener("mouseout", mouseLeaveHandler);
    mouseLeaveHandler = null;
  }
  if (mouseEnterHandler) {
    document.removeEventListener("mouseenter", mouseEnterHandler);
    mouseEnterHandler = null;
  }
}

export function showFloatingWidget(count: number, onClick: () => void): void {
  // Clean up existing widget
  hideFloatingWidget();

  currentOnClick = onClick;

  const widget = createWidget(count);
  widgetElement = widget;

  // Set initial position
  const pos = loadPosition();
  widget.style.cssText = `
    position: fixed;
    left: ${pos.x}px;
    top: ${pos.y}px;
    z-index: 10000;
  `;

  document.body.appendChild(widget);

  setupDragHandlers();
  setupAutoHide();
}

export function hideFloatingWidget(): void {
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  cleanupEventListeners();

  widgetElement?.remove();
  widgetElement = null;
  shadowRoot = null;
  currentOnClick = null;
  isDragging = false;
  isAutoHidden = false;
}

export function updateFloatingWidgetCount(count: number): void {
  if (!shadowRoot) return;

  const button = shadowRoot.querySelector("button");
  if (!button) return;

  // Find existing badge
  const existingBadge = button.querySelector(".badge");

  if (count > 0) {
    if (existingBadge) {
      existingBadge.textContent = String(count);
    } else {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = String(count);
      button.appendChild(badge);
    }
  } else {
    existingBadge?.remove();
  }

  button.setAttribute(
    "aria-label",
    count > 0 ? `${count} pending clips - Click to open popup` : "Clip Todo - Click to open popup",
  );
}
