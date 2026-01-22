import type { ChromeAPI, ChromeRuntimeAPI, ChromeStorageAPI } from "../chrome";

export function createMockStorageAPI(): ChromeStorageAPI {
  const store = new Map<string, unknown>();
  return {
    async get<T>(key: string): Promise<T | null> {
      return (store.get(key) as T) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async remove(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

export function createMockRuntimeAPI(): ChromeRuntimeAPI {
  const listeners: Array<(message: unknown) => void> = [];
  return {
    async sendMessage<T>(message: unknown): Promise<T> {
      for (const listener of listeners) {
        listener(message);
      }
      return {} as T;
    },
    onMessage: {
      addListener(callback) {
        listeners.push((msg) => callback(msg, {} as chrome.runtime.MessageSender, () => {}));
      },
    },
  };
}

export function createMockChromeAPI(overrides: Partial<ChromeAPI> = {}): ChromeAPI {
  return {
    storage: createMockStorageAPI(),
    runtime: createMockRuntimeAPI(),
    tabs: { create: async () => ({}) as chrome.tabs.Tab, query: async () => [] },
    commands: { onCommand: { addListener: () => {} } },
    alarms: { create: () => {}, onAlarm: { addListener: () => {} } },
    ...overrides,
  };
}
