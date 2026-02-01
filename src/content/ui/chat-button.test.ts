import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { injectChatButton, removeChatButton } from "./chat-button";

// Mock chrome.i18n for the t() function used in createChatButton
vi.stubGlobal("chrome", {
  i18n: { getMessage: (key: string) => key },
});

/**
 * Build a Twitch chat input buttons container using the class-based selector.
 * Matches: .chat-input__buttons-container > div (last)
 */
function buildChatContainerByClass(): HTMLElement {
  const container = document.createElement("div");
  container.className = "chat-input__buttons-container";

  const leftDiv = document.createElement("div");
  const rightDiv = document.createElement("div");
  container.appendChild(leftDiv);
  container.appendChild(rightDiv);

  document.body.appendChild(container);
  return container;
}

/**
 * Build a Twitch chat input area using the data-a-target fallback path.
 * Matches: [data-a-target="chat-input"] ancestor has [class*=chat-input]
 *   which contains [class*="buttons-container"] > div (last)
 */
function buildChatContainerByDataTarget(): HTMLElement {
  const chatInputWrapper = document.createElement("div");
  chatInputWrapper.className = "chat-input-wrapper";

  const chatInput = document.createElement("textarea");
  chatInput.setAttribute("data-a-target", "chat-input");
  chatInputWrapper.appendChild(chatInput);

  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "some-buttons-container";
  const leftDiv = document.createElement("div");
  const rightDiv = document.createElement("div");
  buttonsContainer.appendChild(leftDiv);
  buttonsContainer.appendChild(rightDiv);
  chatInputWrapper.appendChild(buttonsContainer);

  document.body.appendChild(chatInputWrapper);
  return chatInputWrapper;
}

describe("chat-button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    removeChatButton();
    vi.useRealTimers();
  });

  describe("injection strategies", () => {
    it("injects via class-based selector (primary)", () => {
      buildChatContainerByClass();
      const onClick = vi.fn();

      injectChatButton(onClick);

      const injected = document.querySelector("#twitch-clips-todo-chat-button");
      expect(injected).not.toBeNull();
    });

    it("injects via data-a-target fallback when class selector fails", () => {
      buildChatContainerByDataTarget();
      const onClick = vi.fn();

      injectChatButton(onClick);

      const injected = document.querySelector("#twitch-clips-todo-chat-button");
      expect(injected).not.toBeNull();
    });

    it("does not inject when no chat container is available", () => {
      const onClick = vi.fn();

      injectChatButton(onClick);

      const injected = document.querySelector("#twitch-clips-todo-chat-button");
      expect(injected).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("removes button from DOM", () => {
      buildChatContainerByClass();
      const onClick = vi.fn();

      injectChatButton(onClick);
      expect(document.querySelector("#twitch-clips-todo-chat-button")).not.toBeNull();

      removeChatButton();
      expect(document.querySelector("#twitch-clips-todo-chat-button")).toBeNull();
    });

    it("can re-inject after removal", () => {
      buildChatContainerByClass();
      const onClick = vi.fn();

      injectChatButton(onClick);
      removeChatButton();
      injectChatButton(onClick);

      expect(document.querySelector("#twitch-clips-todo-chat-button")).not.toBeNull();
    });
  });

  describe("retry with timeout", () => {
    it("injects when chat container appears after timeout", () => {
      const onClick = vi.fn();

      // Initially no chat container
      injectChatButton(onClick);
      expect(document.querySelector("#twitch-clips-todo-chat-button")).toBeNull();

      // Add chat container and trigger timeout
      buildChatContainerByClass();
      vi.advanceTimersByTime(2000);

      const injected = document.querySelector("#twitch-clips-todo-chat-button");
      expect(injected).not.toBeNull();
    });
  });
});
