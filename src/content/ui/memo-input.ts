import { styles } from "./styles";

let containerElement: HTMLElement | null = null;

export function showMemoInput(onSave: (memo: string) => void, onCancel: () => void): void {
  if (containerElement) return;

  const host = document.createElement("div");
  host.id = "twitch-clips-todo-memo";
  const shadowRoot = host.attachShadow({ mode: "closed" });

  const container = document.createElement("div");
  container.setAttribute("style", styles.memoInput.container);

  const input = document.createElement("input");
  input.setAttribute("style", styles.memoInput.input);
  input.type = "text";
  input.placeholder = "Add a memo (optional)";

  const buttonRow = document.createElement("div");
  buttonRow.setAttribute("style", styles.memoInput.buttonRow);

  const cancelBtn = document.createElement("button");
  cancelBtn.setAttribute("style", styles.memoInput.cancelButton);
  cancelBtn.textContent = "Skip";

  const saveBtn = document.createElement("button");
  saveBtn.setAttribute("style", styles.memoInput.saveButton);
  saveBtn.textContent = "Save";

  const handleSave = () => {
    onSave(input.value);
    hideMemoInput();
  };

  const handleCancel = () => {
    onCancel();
    hideMemoInput();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  });

  saveBtn.addEventListener("click", handleSave);
  cancelBtn.addEventListener("click", handleCancel);

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(saveBtn);
  container.appendChild(input);
  container.appendChild(buttonRow);
  shadowRoot.appendChild(container);

  document.body.appendChild(host);
  containerElement = host;

  // Auto-focus the input
  setTimeout(() => input.focus(), 0);
}

export function hideMemoInput(): void {
  containerElement?.remove();
  containerElement = null;
}
