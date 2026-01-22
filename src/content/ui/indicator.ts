import { styles } from "./styles";

let indicatorElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

export function showIndicator(count: number): void {
  if (indicatorElement) {
    updateIndicatorCount(count);
    return;
  }

  const host = document.createElement("div");
  host.id = "twitch-clips-todo-indicator";
  shadowRoot = host.attachShadow({ mode: "closed" });

  const container = document.createElement("div");
  container.setAttribute("style", styles.indicator.container);
  container.title = "Click extension icon to view records";

  const badge = document.createElement("span");
  badge.setAttribute("style", styles.indicator.badge);
  badge.id = "count-badge";
  badge.textContent = count.toString();

  const text = document.createElement("span");
  text.setAttribute("style", styles.indicator.text);
  text.textContent = "pending clips";

  container.appendChild(badge);
  container.appendChild(text);

  shadowRoot.appendChild(container);
  document.body.appendChild(host);
  indicatorElement = host;
}

export function updateIndicatorCount(count: number): void {
  if (!shadowRoot) return;
  const badge = shadowRoot.getElementById("count-badge");
  if (badge) {
    badge.textContent = count.toString();
  }
}

export function hideIndicator(): void {
  indicatorElement?.remove();
  indicatorElement = null;
  shadowRoot = null;
}
