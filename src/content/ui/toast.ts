import { styles } from "./styles";

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
  // Remove existing toast
  const existing = document.getElementById("twitch-clips-todo-toast");
  existing?.remove();
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  const host = document.createElement("div");
  host.id = "twitch-clips-todo-toast";
  const shadowRoot = host.attachShadow({ mode: "closed" });

  // Add animation keyframes
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;

  const toast = document.createElement("div");
  const typeStyle = styles.toast[type];
  toast.setAttribute("style", styles.toast.base + typeStyle);
  toast.textContent = message;

  shadowRoot.appendChild(styleSheet);
  shadowRoot.appendChild(toast);
  document.body.appendChild(host);

  // Auto-dismiss after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => host.remove(), 300);
  }, 3000);
}
