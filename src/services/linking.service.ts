import type { RecordService } from "./record.service";
import type { Record } from "../core/record";
import type { VodInfo } from "../core/twitch";
import { linkRecordsToVod } from "../core/twitch";

export interface LinkingServiceDeps {
  recordService: RecordService;
}

export interface LinkVodPayload {
  vodId: string;
  streamerId: string;
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
      const vod: VodInfo = {
        vodId: payload.vodId,
        streamerId: payload.streamerId,
        startedAt: new Date(payload.startedAt),
        durationSeconds: payload.durationSeconds,
      };

      const records = await recordService.getByStreamerId(payload.streamerId);
      const unlinkedRecords = records.filter((r) => r.vodId === null && r.sourceType === "live");

      const matches = linkRecordsToVod(unlinkedRecords, vod);
      const linkedRecords: Record[] = [];

      for (const { record, vodOffset } of matches) {
        const linked = await recordService.linkToVod(record.id, payload.vodId, vodOffset);
        linkedRecords.push(linked);
      }

      return linkedRecords;
    },
  };
}
