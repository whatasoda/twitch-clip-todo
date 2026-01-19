import type { ChromeAlarmsAPI } from "./types";

export function createAlarmsAPI(): ChromeAlarmsAPI {
  return {
    create(name, alarmInfo) {
      chrome.alarms.create(name, alarmInfo);
    },
    onAlarm: {
      addListener(callback) {
        chrome.alarms.onAlarm.addListener(callback);
      },
    },
  };
}
