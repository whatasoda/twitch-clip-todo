import type { Record } from "../../core/record";
import { buildClipCreationUrl } from "../../core/twitch";
import type { VodMetadata } from "../../services/twitch.service";
import type { DiscoveryResult } from "../../services/vod-discovery.service";
import { sendMessage } from "../../shared/messaging";

export function useRecordActions() {
  async function updateMemo(id: string, memo: string): Promise<Record> {
    return sendMessage<Record>({ type: "UPDATE_MEMO", payload: { id, memo } });
  }

  async function markCompleted(id: string): Promise<Record> {
    return sendMessage<Record>({ type: "MARK_COMPLETED", payload: { id } });
  }

  async function deleteRecord(id: string): Promise<void> {
    await sendMessage<null>({ type: "DELETE_RECORD", payload: { id } });
  }

  async function openClipCreation(record: Record): Promise<void> {
    if (!record.vodId && !record.broadcastId) {
      throw new Error("Record has no VOD or broadcast ID");
    }

    const url = buildClipCreationUrl({
      vodId: record.vodId ?? undefined,
      broadcastId: record.broadcastId ?? undefined,
      offsetSeconds: record.timestampSeconds,
      broadcasterLogin: record.streamerId,
    });

    await chrome.tabs.create({ url });
    await markCompleted(record.id);
  }

  async function discoverVodForStreamer(streamerId: string): Promise<DiscoveryResult> {
    return sendMessage<DiscoveryResult>({
      type: "DISCOVER_VOD_FOR_STREAMER",
      payload: { streamerId },
    });
  }

  async function getRecentVods(streamerId: string): Promise<VodMetadata[]> {
    return sendMessage<VodMetadata[]>({
      type: "GET_RECENT_VODS",
      payload: { streamerId },
    });
  }

  async function openClipForVod(
    record: Record,
    vodId: string,
    offsetSeconds: number,
  ): Promise<void> {
    const url = buildClipCreationUrl({
      vodId,
      broadcasterLogin: record.streamerId,
      offsetSeconds,
    });
    await chrome.tabs.create({ url });
    // Do NOT mark as completed — user selected VOD manually, clip success is uncertain
  }

  async function deleteByStreamerId(streamerId: string): Promise<number> {
    return sendMessage<number>({
      type: "DELETE_RECORDS_BY_STREAMER",
      payload: { streamerId },
    });
  }

  async function deleteCompleted(): Promise<number> {
    return sendMessage<number>({ type: "DELETE_COMPLETED_RECORDS" });
  }

  return {
    updateMemo,
    markCompleted,
    deleteRecord,
    openClipCreation,
    discoverVodForStreamer,
    getRecentVods,
    openClipForVod,
    deleteByStreamerId,
    deleteCompleted,
  };
}
