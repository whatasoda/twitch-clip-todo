import { styles } from "./styles";

let buttonElement: HTMLElement | null = null;

export function createRecordButton(onClick: () => void): HTMLElement {
  const host = document.createElement("div");
  host.id = "twitch-clips-todo-button";
  const shadowRoot = host.attachShadow({ mode: "closed" });

  const button = document.createElement("button");
  button.setAttribute("style", styles.button.base);
  button.innerHTML = "\u{1F4CC}"; // pin emoji
  button.title = "Record moment (Alt+Shift+C)";

  button.addEventListener("mouseenter", () => {
    button.style.background = "#772ce8";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#9147ff";
  });
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  shadowRoot.appendChild(button);

  return host;
}

export function injectRecordButton(onClick: () => void): void {
  if (buttonElement) return;

  const button = createRecordButton(onClick);
  buttonElement = button;

  // Try to inject near Twitch player controls
  const controlsBar = document.querySelector('[data-a-target="player-controls"]');
  if (controlsBar) {
    button.style.cssText = `
      position: absolute;
      right: 10px;
      top: -46px;
      z-index: 1000;
    `;
    (controlsBar as HTMLElement).style.position = "relative";
    controlsBar.appendChild(button);
  } else {
    // Fallback: fixed position
    button.style.cssText = `
      position: fixed;
      bottom: 140px;
      right: 20px;
      z-index: 10000;
    `;
    document.body.appendChild(button);
  }
}

export function removeRecordButton(): void {
  buttonElement?.remove();
  buttonElement = null;
}
