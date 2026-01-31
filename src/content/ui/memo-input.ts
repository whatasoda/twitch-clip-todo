import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { createShadowHost } from "./shadow-dom";
import { styles } from "./styles";
import { showToast } from "./toast";

let containerElement: HTMLElement | null = null;

export function showMemoInput(
  onSave: (memo: string) => void | Promise<void>,
  onCancel: () => void | Promise<void>,
  readyPromise?: Promise<void>,
): void {
  if (containerElement) return;

  const { host, shadow } = createShadowHost("twitch-clips-todo-memo");

  // The backdrop is transparent so it does not block the stream view.
  // Users can continue watching while entering a memo.
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

  // If readyPromise is provided, disable save button until data is ready
  let isReady = !readyPromise;
  if (readyPromise) {
    saveBtn.disabled = true;
    saveBtn.textContent = `${t(MSG.COMMON_LOADING)}`;
    readyPromise
      .then(() => {
        isReady = true;
        saveBtn.disabled = false;
        saveBtn.textContent = t(MSG.COMMON_SAVE);
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : t(MSG.TOAST_RECORD_FAILED), "error");
        hideMemoInput();
      });
  }

  // IME composition state
  let isComposing = false;

  const handleSave = async () => {
    if (!isReady) return;
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
      // Only cancel if not in IME composition (let IME handle ESC itself)
      if (!isComposing && !e.isComposing) {
        handleCancel();
      }
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
