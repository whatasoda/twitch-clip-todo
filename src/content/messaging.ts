import type { Record } from "../core/record";
import type { LiveStreamInfo, StreamerInfo, VodMetadata } from "../services/twitch.service";
import type { DiscoveryResult } from "../services/vod-discovery.service";
import type {
  CreateRecordPayload,
  LinkVodPayload,
  MessageResponse,
  MessageToBackground,
} from "../shared/types";

async function sendMessage<T>(message: MessageToBackground): Promise<T> {
  const response = await chrome.runtime.sendMessage<MessageToBackground, MessageResponse<T>>(
    message,
  );
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

// Twitch API messaging functions

export async function getStreamerInfo(login: string): Promise<StreamerInfo | null> {
  return sendMessage<StreamerInfo | null>({ type: "TWITCH_GET_STREAMER_INFO", payload: { login } });
}

export async function getVodMetadataFromApi(vodId: string): Promise<VodMetadata | null> {
  return sendMessage<VodMetadata | null>({ type: "TWITCH_GET_VOD_METADATA", payload: { vodId } });
}

export async function getCurrentStream(login: string): Promise<LiveStreamInfo | null> {
  return sendMessage<LiveStreamInfo | null>({
    type: "TWITCH_GET_CURRENT_STREAM",
    payload: { login },
  });
}

export async function getCurrentStreamCached(login: string): Promise<LiveStreamInfo | null> {
  return sendMessage<LiveStreamInfo | null>({
    type: "TWITCH_GET_CURRENT_STREAM_CACHED",
    payload: { login },
  });
}

export async function createRecord(payload: CreateRecordPayload): Promise<Record> {
  return sendMessage<Record>({ type: "CREATE_RECORD", payload });
}

export async function updateMemo(id: string, memo: string): Promise<Record> {
  return sendMessage<Record>({ type: "UPDATE_MEMO", payload: { id, memo } });
}

export async function getPendingCount(streamerId: string): Promise<number> {
  return sendMessage<number>({ type: "GET_PENDING_COUNT", payload: { streamerId } });
}

export async function linkVod(payload: LinkVodPayload): Promise<Record[]> {
  return sendMessage<Record[]>({ type: "LINK_VOD", payload });
}

export async function deleteRecord(id: string): Promise<void> {
  await sendMessage<null>({ type: "DELETE_RECORD", payload: { id } });
}

export async function discoverVodForStreamer(streamerId: string): Promise<DiscoveryResult> {
  return sendMessage<DiscoveryResult>({
    type: "DISCOVER_VOD_FOR_STREAMER",
    payload: { streamerId },
  });
}
