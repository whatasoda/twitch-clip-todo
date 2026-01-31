import type { Record, RecordStore } from "../core/record";
import { createEmptyStore, createRecord } from "../core/record";
import type { ChromeStorageAPI } from "../infrastructure/chrome";
import { STORAGE_KEYS } from "../shared/constants";
import type { CreateRecordPayload } from "../shared/types";

export interface RecordServiceDeps {
  storage: ChromeStorageAPI;
}

export interface RecordService {
  create(payload: CreateRecordPayload): Promise<Record>;
  getAll(): Promise<Record[]>;
  getByStreamerId(streamerId: string): Promise<Record[]>;
  getById(id: string): Promise<Record | null>;
  updateMemo(id: string, memo: string): Promise<Record>;
  markCompleted(id: string): Promise<Record>;
  linkToVod(id: string, vodId: string, vodOffset: number): Promise<Record>;
  delete(id: string): Promise<void>;
  deleteByStreamerId(streamerId: string): Promise<number>;
  deleteCompleted(): Promise<number>;
  getPendingCount(streamerId: string): Promise<number>;
}

export function createRecordService(deps: RecordServiceDeps): RecordService {
  const { storage } = deps;

  async function getStore(): Promise<RecordStore> {
    const store = await storage.get<RecordStore>(STORAGE_KEYS.RECORDS);
    return store ?? createEmptyStore();
  }

  async function saveStore(store: RecordStore): Promise<void> {
    await storage.set(STORAGE_KEYS.RECORDS, store);
  }

  async function updateRecord(id: string, updater: (record: Record) => Record): Promise<Record> {
    const store = await getStore();
    const index = store.records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Record not found: ${id}`);
    }
    const record = store.records[index];
    if (!record) {
      throw new Error(`Record not found: ${id}`);
    }
    const updated = updater(record);
    updated.updatedAt = new Date().toISOString();
    store.records[index] = updated;
    await saveStore(store);
    return updated;
  }

  return {
    async create(payload) {
      const store = await getStore();
      const record = createRecord(payload);
      store.records.push(record);
      await saveStore(store);
      return record;
    },

    async getAll() {
      const store = await getStore();
      return store.records;
    },

    async getByStreamerId(streamerId) {
      const store = await getStore();
      return store.records.filter((r) => r.streamerId === streamerId);
    },

    async getById(id) {
      const store = await getStore();
      return store.records.find((r) => r.id === id) ?? null;
    },

    async updateMemo(id, memo) {
      return updateRecord(id, (record) => ({ ...record, memo }));
    },

    async markCompleted(id) {
      return updateRecord(id, (record) => ({
        ...record,
        completedAt: new Date().toISOString(),
      }));
    },

    async linkToVod(id, vodId, vodOffset) {
      return updateRecord(id, (record) => ({
        ...record,
        vodId,
        timestampSeconds: vodOffset,
        sourceType: "vod" as const,
      }));
    },

    async delete(id) {
      const store = await getStore();
      store.records = store.records.filter((r) => r.id !== id);
      await saveStore(store);
    },

    async deleteByStreamerId(streamerId) {
      const store = await getStore();
      const before = store.records.length;
      store.records = store.records.filter((r) => r.streamerId !== streamerId);
      const deleted = before - store.records.length;
      if (deleted > 0) {
        await saveStore(store);
      }
      return deleted;
    },

    async deleteCompleted() {
      const store = await getStore();
      const before = store.records.length;
      store.records = store.records.filter((r) => r.completedAt === null);
      const deleted = before - store.records.length;
      if (deleted > 0) {
        await saveStore(store);
      }
      return deleted;
    },

    async getPendingCount(streamerId) {
      const records = await this.getByStreamerId(streamerId);
      return records.filter((r) => r.completedAt === null).length;
    },
  };
}
