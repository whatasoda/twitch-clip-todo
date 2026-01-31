import type { CreateRecordPayload } from "../../shared/types";
import type { Record, RecordStore } from "./types";

export function generateId(): string {
  return crypto.randomUUID();
}

export function createRecord(payload: CreateRecordPayload): Record {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    streamerId: payload.streamerId,
    streamerName: payload.streamerName,
    timestampSeconds: payload.timestampSeconds,
    memo: payload.memo ?? "",
    sourceType: payload.sourceType,
    vodId: payload.vodId,
    broadcastId: payload.broadcastId,
    recordedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function isRecordLinked(record: Record): boolean {
  return record.vodId !== null;
}

export function canCreateClip(record: Record): boolean {
  return record.vodId !== null;
}

export function isRecordCompleted(record: Record): boolean {
  return record.completedAt !== null;
}

export function groupRecordsByStreamer(records: Record[]): Map<string, Record[]> {
  const groups = new Map<string, Record[]>();
  for (const record of records) {
    const existing = groups.get(record.streamerId) ?? [];
    existing.push(record);
    groups.set(record.streamerId, existing);
  }
  return groups;
}

export function sortRecordsByDate(records: Record[], order: "asc" | "desc" = "desc"): Record[] {
  return [...records].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return order === "desc" ? diff : -diff;
  });
}

export function createEmptyStore(): RecordStore {
  return { version: 1, records: [] };
}
