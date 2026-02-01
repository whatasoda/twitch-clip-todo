import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { injectRecordButton, removeRecordButton } from "./record-button";

// Mock chrome.i18n for the t() function used in createRecordButton
vi.stubGlobal("chrome", {
  i18n: { getMessage: (key: string) => key },
});

/**
 * Build a minimal Twitch player controls DOM structure.
 * Matches the selectors used in record-button.ts:
 *   [data-a-target="player-controls"]
 *     > [class*="player-controls__right-control-group"]
 */
function buildPlayerControls(): HTMLElement {
  const controls = document.createElement("div");
  controls.setAttribute("data-a-target", "player-controls");

  const rightGroup = document.createElement("div");
  rightGroup.className = "player-controls__right-control-group";

  // Need at least one child for insertBefore to work
  const placeholder = document.createElement("div");
  rightGroup.appendChild(placeholder);

  controls.appendChild(rightGroup);
  document.body.appendChild(controls);
  return controls;
}

/**
 * Build a Twitch clip button with the given aria-label.
 * Wrapped in nested divs to mimic Twitch's button hierarchy.
 */
function buildClipButton(ariaLabel: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.setAttribute("aria-label", ariaLabel);

  // Twitch wraps buttons: button > div > div > buttonRow(multiple children)
  const wrapper1 = document.createElement("div");
  wrapper1.appendChild(button);
  const wrapper2 = document.createElement("div");
  wrapper2.appendChild(wrapper1);

  // Button row needs multiple children for the injection to work
  const buttonRow = document.createElement("div");
  const otherButton = document.createElement("div");
  buttonRow.appendChild(otherButton);
  buttonRow.appendChild(wrapper2);

  document.body.appendChild(buttonRow);
  return button;
}

describe("record-button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    removeRecordButton();
    vi.useRealTimers();
  });

  describe("injection priority", () => {
    it("injects into player controls when available (primary strategy)", () => {
      buildPlayerControls();
      const onClick = vi.fn();

      injectRecordButton(onClick);

      const rightGroup = document.querySelector('[class*="player-controls__right-control-group"]');
      const injected = rightGroup?.querySelector("#twitch-clips-todo-button");
      expect(injected).not.toBeNull();
    });

    it("injects next to clip button when player controls are not available", () => {
      buildClipButton("Clip");
      const onClick = vi.fn();

      injectRecordButton(onClick);

      // Button should be in the DOM but not in fixed position
      const injected = document.querySelector("#twitch-clips-todo-button");
      expect(injected).not.toBeNull();
      expect((injected as HTMLElement).style.position).not.toBe("fixed");
    });

    it("falls back to fixed position when nothing is available", () => {
      const onClick = vi.fn();

      injectRecordButton(onClick);

      const injected = document.querySelector("#twitch-clips-todo-button");
      expect(injected).not.toBeNull();
      expect((injected as HTMLElement).style.position).toBe("fixed");
    });

    it("prefers player controls over clip-adjacent when both are available", () => {
      buildPlayerControls();
      buildClipButton("Clip");
      const onClick = vi.fn();

      injectRecordButton(onClick);

      const rightGroup = document.querySelector('[class*="player-controls__right-control-group"]');
      const injectedInControls = rightGroup?.querySelector("#twitch-clips-todo-button");
      expect(injectedInControls).not.toBeNull();
    });
  });

  describe("locale support", () => {
    const locales = [
      { label: "Clip", lang: "en" },
      { label: "クリップ", lang: "ja" },
      { label: "클립", lang: "ko" },
      { label: "Clipe", lang: "pt" },
      { label: "Klip", lang: "tr" },
      { label: "Клип", lang: "ru" },
      { label: "คลิป", lang: "th" },
      { label: "剪辑", lang: "zh-CN" },
      { label: "剪輯", lang: "zh-TW" },
    ];

    for (const { label, lang } of locales) {
      it(`finds clip button with ${lang} label ("${label}")`, () => {
        buildClipButton(label);
        const onClick = vi.fn();

        injectRecordButton(onClick);

        const injected = document.querySelector("#twitch-clips-todo-button");
        expect(injected).not.toBeNull();
        // Should not be in fixed position since clip button was found
        expect((injected as HTMLElement).style.position).not.toBe("fixed");
      });
    }

    it("does not match unrelated button labels", () => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", "Settings");
      document.body.appendChild(button);

      const onClick = vi.fn();
      injectRecordButton(onClick);

      // Should fall back to fixed position
      const injected = document.querySelector("#twitch-clips-todo-button");
      expect((injected as HTMLElement).style.position).toBe("fixed");
    });
  });

  describe("cleanup", () => {
    it("removes button from DOM", () => {
      buildPlayerControls();
      const onClick = vi.fn();

      injectRecordButton(onClick);
      expect(document.querySelector("#twitch-clips-todo-button")).not.toBeNull();

      removeRecordButton();
      expect(document.querySelector("#twitch-clips-todo-button")).toBeNull();
    });

    it("can re-inject after removal", () => {
      buildPlayerControls();
      const onClick = vi.fn();

      injectRecordButton(onClick);
      removeRecordButton();
      injectRecordButton(onClick);

      expect(document.querySelector("#twitch-clips-todo-button")).not.toBeNull();
    });
  });

  describe("retry with timeout", () => {
    it("upgrades from fixed position when player controls appear", () => {
      const onClick = vi.fn();

      // Initially no player controls
      injectRecordButton(onClick);
      expect(
        (document.querySelector("#twitch-clips-todo-button") as HTMLElement).style.position,
      ).toBe("fixed");

      // Add player controls and trigger timeout
      buildPlayerControls();
      vi.advanceTimersByTime(2000);

      const injected = document.querySelector("#twitch-clips-todo-button") as HTMLElement;
      expect(injected).not.toBeNull();
      expect(injected.style.position).not.toBe("fixed");
    });
  });
});
