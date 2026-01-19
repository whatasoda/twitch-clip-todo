import type { ChromeCommandsAPI } from "./types";

export function createCommandsAPI(): ChromeCommandsAPI {
  return {
    onCommand: {
      addListener(callback) {
        chrome.commands.onCommand.addListener(callback);
      },
    },
  };
}
