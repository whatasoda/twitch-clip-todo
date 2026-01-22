export interface ChromeStorageAPI {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface ChromeRuntimeAPI {
  sendMessage<T>(message: unknown): Promise<T>;
  onMessage: {
    addListener(
      callback: (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: unknown) => void,
      ) => boolean | undefined,
    ): void;
  };
}

export interface ChromeTabsAPI {
  create(options: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
  query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
}

export interface ChromeCommandsAPI {
  onCommand: {
    addListener(callback: (command: string, tab?: chrome.tabs.Tab) => void): void;
  };
}

export interface ChromeAlarmsAPI {
  create(name: string, alarmInfo: chrome.alarms.AlarmCreateInfo): void;
  onAlarm: {
    addListener(callback: (alarm: chrome.alarms.Alarm) => void): void;
  };
}

export interface ChromeAPI {
  storage: ChromeStorageAPI;
  runtime: ChromeRuntimeAPI;
  tabs: ChromeTabsAPI;
  commands: ChromeCommandsAPI;
  alarms: ChromeAlarmsAPI;
}
