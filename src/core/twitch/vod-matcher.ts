import type { Record } from "../record";

export interface VodInfo {
  vodId: string;
  streamerId: string;
  startedAt: Date;
  durationSeconds: number;
}

export interface VodInfoWithStreamId {
  vodId: string;
  streamerId: string;
  streamId: string;
  startedAt: Date;
  durationSeconds: number;
}

// Check if a live record falls within a VOD's timeframe
export function matchRecordToVod(record: Record, vod: VodInfo): boolean {
  if (record.sourceType !== "live") return false;
  if (record.streamerId !== vod.streamerId) return false;

  const recordTime = new Date(record.recordedAt);
  const vodEndTime = new Date(vod.startedAt.getTime() + vod.durationSeconds * 1000);

  return recordTime >= vod.startedAt && recordTime <= vodEndTime;
}

// Calculate the offset in the VOD for a live record
export function calculateVodOffset(record: Record, vodStartedAt: Date): number {
  const recordTime = new Date(record.recordedAt);
  const offsetMs = recordTime.getTime() - vodStartedAt.getTime();
  return Math.max(0, Math.floor(offsetMs / 1000));
}

// Link multiple records to a VOD
export function linkRecordsToVod(
  records: Record[],
  vod: VodInfo,
): Array<{ record: Record; vodOffset: number }> {
  return records
    .filter((r) => matchRecordToVod(r, vod))
    .map((record) => ({
      record,
      vodOffset: calculateVodOffset(record, vod.startedAt),
    }));
}

// Check if a record matches a VOD by stream_id (precise matching, no fallback)
export function matchRecordToVodByStreamId(
  record: Record,
  vod: VodInfoWithStreamId,
): boolean {
  if (record.sourceType !== "live") return false;
  if (record.broadcastId === null) return false;
  if (record.streamerId !== vod.streamerId) return false;

  return record.broadcastId === vod.streamId;
}

// Link multiple records to a VOD using stream_id matching
export function linkRecordsByStreamId(
  records: Record[],
  vod: VodInfoWithStreamId,
): Array<{ record: Record; vodOffset: number }> {
  return records
    .filter((r) => matchRecordToVodByStreamId(r, vod))
    .map((record) => ({
      record,
      vodOffset: calculateVodOffset(record, vod.startedAt),
    }));
}
