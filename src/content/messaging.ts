import type { Record } from "../core/record";
import type { LiveStreamInfo, StreamerInfo, VodMetadata } from "../services/twitch.service";
import type { DiscoveryResult } from "../services/vod-discovery.service";
import { sendMessage } from "../shared/messaging";
import type { CreateRecordPayload, LinkVodPayload, OnboardingState } from "../shared/types";

// Auth status

export async function checkAuthStatus(): Promise<{ isAuthenticated: boolean }> {
  return sendMessage<{ isAuthenticated: boolean }>({ type: "TWITCH_GET_AUTH_STATUS" });
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

// Onboarding

export async function getOnboardingState(): Promise<OnboardingState> {
  return sendMessage<OnboardingState>({ type: "GET_ONBOARDING_STATE" });
}

export async function updateOnboardingState(
  updates: Partial<OnboardingState>,
): Promise<OnboardingState> {
  return sendMessage<OnboardingState>({ type: "UPDATE_ONBOARDING_STATE", payload: updates });
}
