export interface Record {
  id: string;
  streamerId: string;
  streamerName: string;
  timestampSeconds: number;
  memo: string;
  sourceType: "live" | "vod";
  vodId: string | null;
  broadcastId: string | null;
  recordedAt: string; // ISO 8601 - ストリーム内の記録時刻
  completedAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface RecordStore {
  version: number;
  records: Record[];
}

export interface CreateRecordPayload {
  streamerId: string;
  streamerName: string;
  timestampSeconds: number;
  sourceType: "live" | "vod";
  vodId: string | null;
  broadcastId: string | null;
}
