import type { RecordStore } from "../core/record";
import type { Settings } from "../core/settings";
import { DEFAULT_SETTINGS } from "../core/settings";
import type { ChromeAlarmsAPI, ChromeStorageAPI } from "../infrastructure/chrome";
import { STORAGE_KEYS } from "../shared/constants";
import type { CleanupNotification } from "../shared/types";

export interface CleanupServiceDeps {
  storage: ChromeStorageAPI;
  alarms: ChromeAlarmsAPI;
  onCleanup?: (deletedCount: number) => void;
}

export interface CleanupService {
  initialize(): void;
  runCleanup(): Promise<number>;
}

const CLEANUP_ALARM_NAME = "cleanup-old-records";

export function createCleanupService(deps: CleanupServiceDeps): CleanupService {
  const { storage, alarms, onCleanup } = deps;

  return {
    initialize() {
      // Run cleanup on startup
      this.runCleanup();

      // Schedule daily cleanup
      alarms.create(CLEANUP_ALARM_NAME, { periodInMinutes: 1440 }); // 24 hours

      alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === CLEANUP_ALARM_NAME) {
          this.runCleanup();
        }
      });
    },

    async runCleanup() {
      const settings = await storage.get<Settings>(STORAGE_KEYS.SETTINGS);
      const cleanupDays = settings?.cleanupDays ?? DEFAULT_SETTINGS.cleanupDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

      const store = await storage.get<RecordStore>(STORAGE_KEYS.RECORDS);
      if (!store) return 0;

      const originalCount = store.records.length;
      store.records = store.records.filter((record) => new Date(record.createdAt) > cutoffDate);
      const deletedCount = originalCount - store.records.length;

      if (deletedCount > 0) {
        await storage.set(STORAGE_KEYS.RECORDS, store);
        await storage.set<CleanupNotification>(STORAGE_KEYS.CLEANUP_NOTIFICATION, {
          count: deletedCount,
          timestamp: new Date().toISOString(),
        });
        onCleanup?.(deletedCount);
      }

      return deletedCount;
    },
  };
}
