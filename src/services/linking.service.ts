import type { Record } from "../core/record";
import type { VodInfoWithStreamId } from "../core/twitch";
import { linkRecordsByStreamId } from "../core/twitch";
import type { RecordService } from "./record.service";

export interface LinkingServiceDeps {
  recordService: RecordService;
}

export interface LinkVodPayload {
  vodId: string;
  streamerId: string;
  streamId: string; // Required for precise matching
  startedAt: string; // ISO 8601
  durationSeconds: number;
}

export interface LinkingService {
  linkVod(payload: LinkVodPayload): Promise<Record[]>;
}

export function createLinkingService(deps: LinkingServiceDeps): LinkingService {
  const { recordService } = deps;

  return {
    async linkVod(payload) {
      const vod: VodInfoWithStreamId = {
        vodId: payload.vodId,
        streamerId: payload.streamerId,
        streamId: payload.streamId,
        startedAt: new Date(payload.startedAt),
        durationSeconds: payload.durationSeconds,
      };

      const records = await recordService.getByStreamerId(payload.streamerId);
      const unlinkedRecords = records.filter((r) => r.vodId === null && r.sourceType === "live");

      // Use stream_id based matching (no time-based fallback)
      const matches = linkRecordsByStreamId(unlinkedRecords, vod);
      const linkedRecords: Record[] = [];

      for (const { record, vodOffset } of matches) {
        const linked = await recordService.linkToVod(record.id, payload.vodId, vodOffset);
        linkedRecords.push(linked);
      }

      return linkedRecords;
    },
  };
}
