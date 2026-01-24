export interface ShadowDOMHost {
  host: HTMLElement;
  shadow: ShadowRoot;
}

/**
 * Create a Shadow DOM host element with an attached shadow root.
 */
export function createShadowHost(
  id: string,
  mode: "open" | "closed" = "closed",
): ShadowDOMHost {
  const host = document.createElement("div");
  host.id = id;
  const shadow = host.attachShadow({ mode });
  return { host, shadow };
}

/**
 * Inject CSS styles into a shadow root.
 */
export function injectStyles(shadow: ShadowRoot, css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);
}
