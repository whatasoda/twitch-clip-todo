import type { ChromeRuntimeAPI } from "./types";

export function createRuntimeAPI(): ChromeRuntimeAPI {
  return {
    sendMessage<T>(message: unknown): Promise<T> {
      return chrome.runtime.sendMessage(message);
    },
    onMessage: {
      addListener(callback) {
        chrome.runtime.onMessage.addListener(callback);
      },
    },
  };
}
