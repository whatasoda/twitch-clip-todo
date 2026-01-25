import { token } from "../../../styled-system-content/tokens";

/**
 * Generate CSS string for the floating widget.
 * Uses Panda CSS tokens for consistent color values.
 */
export function getWidgetStyles(): string {
  return `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.widget {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 18px;
  background: ${token("colors.twitchBg")};
  color: white;
  cursor: grab;
  transition: background 0.1s ease, transform 0.1s ease;
  font-size: 14px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  user-select: none;
  animation: fadeIn 0.2s ease;
}

.widget:hover {
  background: ${token("colors.twitchBgHover")};
  transform: scale(1.05);
}

.widget.dragging {
  cursor: grabbing;
}

.widget.dragging:hover {
  transform: scale(1);
}

.widget.hiding {
  animation: fadeOut 0.3s ease forwards;
}

.widget.hidden {
  display: none;
}

.widget .icon {
  display: flex;
  align-items: center;
}

.widget .badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: white;
  color: ${token("colors.twitch")};
  font-size: 12px;
  font-weight: bold;
}
`;
}
