import { BOOKMARK_ICON_OUTLINED, styles } from "./styles";

const STORAGE_KEY = "twitch-clip-todo-widget-position";
const HIDE_DELAY_MS = 3000;

let widgetElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let hideTimeoutId: number | null = null;
let isDragging = false;
let didDrag = false; // True if mouse actually moved during drag
let dragStartPos = { x: 0, y: 0 };
let widgetStartPos = { x: 0, y: 0 };
let currentOnClick: (() => void) | null = null;

// Event handler references for cleanup
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let mouseUpHandler: (() => void) | null = null;
let mouseLeaveHandler: (() => void) | null = null;
let mouseEnterHandler: (() => void) | null = null;

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      // Ensure position is within viewport
      return {
        x: Math.min(Math.max(0, pos.x), window.innerWidth - 60),
        y: Math.min(Math.max(0, pos.y), window.innerHeight - 40),
      };
    }
  } catch {
    // Ignore parse errors
  }
  // Default: top-right area
  return { x: window.innerWidth - 80, y: 100 };
}

function savePosition(pos: { x: number; y: number }): void {
  try {
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

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .widget {
      animation: fadeIn 0.2s ease;
    }
    .widget.hiding {
      animation: fadeOut 0.3s ease forwards;
    }
    .widget.hidden {
      display: none;
    }
  `;
  shadow.appendChild(style);

  const button = document.createElement("button");
  button.className = "widget";
  button.setAttribute("style", styles.floatingWidget.base);
  button.setAttribute("aria-label", `${count} pending clips - Click to open side panel`);
  button.title = "Click to open Clip Todo panel\nDrag to move";
  button.innerHTML = `
    <span style="display: flex; align-items: center;">${BOOKMARK_ICON_OUTLINED}</span>
    <span style="${styles.floatingWidget.badge}">${count}</span>
  `;

  // Hover effects
  button.addEventListener("mouseenter", () => {
    if (!isDragging) {
      button.style.background = "rgba(145, 71, 255, 0.9)";
      button.style.transform = "scale(1.05)";
    }
  });
  button.addEventListener("mouseleave", () => {
    if (!isDragging) {
      button.style.background = "rgba(145, 71, 255, 0.85)";
      button.style.transform = "scale(1)";
    }
  });

  // Drag start
  button.addEventListener("mousedown", (e) => {
    isDragging = true;
    didDrag = false;
    dragStartPos = { x: e.clientX, y: e.clientY };
    const rect = host.getBoundingClientRect();
    widgetStartPos = { x: rect.left, y: rect.top };
    button.style.cursor = "grabbing";
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
        button.style.cursor = "grab";
      }
      // Save position
      savePosition({
        x: parseInt(widgetElement.style.left, 10),
        y: parseInt(widgetElement.style.top, 10),
      });
    }
  };

  document.addEventListener("mousemove", mouseMoveHandler);
  document.addEventListener("mouseup", mouseUpHandler);
}

function setupAutoHide(): void {
  mouseLeaveHandler = () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    hideTimeoutId = window.setTimeout(() => {
      const button = shadowRoot?.querySelector("button");
      if (button && !isDragging) {
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
    const button = shadowRoot?.querySelector("button");
    if (button) {
      button.classList.remove("hidden", "hiding");
    }
  };

  document.addEventListener("mouseleave", mouseLeaveHandler);
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
    document.removeEventListener("mouseleave", mouseLeaveHandler);
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
}

export function updateFloatingWidgetCount(count: number): void {
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
