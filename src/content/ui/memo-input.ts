import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { createShadowHost } from "./shadow-dom";
import { styles } from "./styles";

let containerElement: HTMLElement | null = null;

export function showMemoInput(
  onSave: (memo: string) => void | Promise<void>,
  onCancel: () => void | Promise<void>,
): void {
  if (containerElement) return;

  const { host, shadow } = createShadowHost("twitch-clips-todo-memo");

  const backdrop = document.createElement("div");
  backdrop.setAttribute("style", styles.memoInput.backdrop);

  const container = document.createElement("div");
  container.setAttribute("style", styles.memoInput.container);
  // Prevent clicks inside container from triggering backdrop click
  container.addEventListener("click", (e) => e.stopPropagation());

  const title = document.createElement("div");
  title.setAttribute("style", styles.memoInput.title);
  title.textContent = t(MSG.MEMO_TITLE);

  const input = document.createElement("input");
  input.setAttribute("style", styles.memoInput.input);
  input.type = "text";
  input.placeholder = t(MSG.MEMO_PLACEHOLDER);

  const buttonRow = document.createElement("div");
  buttonRow.setAttribute("style", styles.memoInput.buttonRow);

  const cancelBtn = document.createElement("button");
  cancelBtn.setAttribute("style", styles.memoInput.cancelButton);
  cancelBtn.textContent = t(MSG.COMMON_CANCEL);

  const saveBtn = document.createElement("button");
  saveBtn.setAttribute("style", styles.memoInput.saveButton);
  saveBtn.textContent = t(MSG.COMMON_SAVE);

  // IME composition state
  let isComposing = false;

  const handleSave = async () => {
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    await onSave(input.value);
    hideMemoInput();
  };

  const handleCancel = async () => {
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    cancelBtn.textContent = t(MSG.MEMO_CANCELLING);
    await onCancel();
    hideMemoInput();
  };

  // Track IME composition state
  input.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  input.addEventListener("compositionend", () => {
    isComposing = false;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Only save if not in IME composition
      if (!isComposing && !e.isComposing) {
        handleSave();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      // ESC should always cancel, even during composition
      handleCancel();
    }
  });

  saveBtn.addEventListener("click", handleSave);
  cancelBtn.addEventListener("click", handleCancel);
  backdrop.addEventListener("click", handleCancel);

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(saveBtn);
  container.appendChild(title);
  container.appendChild(input);
  container.appendChild(buttonRow);
  backdrop.appendChild(container);
  shadow.appendChild(backdrop);

  document.body.appendChild(host);
  containerElement = host;

  // Auto-focus the input
  setTimeout(() => input.focus(), 0);
}

export function hideMemoInput(): void {
  containerElement?.remove();
  containerElement = null;
}
