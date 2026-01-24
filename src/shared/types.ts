// Message types for communication between components

export interface CreateRecordPayload {
  streamerId: string;
  streamerName: string;
  timestampSeconds: number;
  sourceType: "live" | "vod";
  vodId: string | null;
  broadcastId: string | null;
}

export interface LinkVodPayload {
  vodId: string;
  streamerId: string;
  streamId: string; // Required for precise matching
  startedAt: string; // ISO 8601
  durationSeconds: number;
}

export type MessageToBackground =
  | { type: "CREATE_RECORD"; payload: CreateRecordPayload }
  | { type: "UPDATE_MEMO"; payload: { id: string; memo: string } }
  | { type: "MARK_COMPLETED"; payload: { id: string } }
  | { type: "DELETE_RECORD"; payload: { id: string } }
  | { type: "GET_RECORDS"; payload?: { streamerId?: string } }
  | { type: "LINK_VOD"; payload: LinkVodPayload }
  | { type: "GET_PENDING_COUNT"; payload: { streamerId: string } }
  // Twitch API messages
  | { type: "TWITCH_GET_AUTH_STATUS" }
  | { type: "TWITCH_START_DEVICE_AUTH" }
  | { type: "TWITCH_POLL_TOKEN"; payload: { deviceCode: string; interval: number } }
  | { type: "TWITCH_CANCEL_AUTH" }
  | { type: "TWITCH_LOGOUT" }
  | { type: "TWITCH_GET_STREAMER_INFO"; payload: { login: string } }
  | { type: "TWITCH_GET_VOD_METADATA"; payload: { vodId: string } }
  | { type: "TWITCH_GET_CURRENT_STREAM"; payload: { login: string } }
  | { type: "TWITCH_GET_CURRENT_STREAM_CACHED"; payload: { login: string } }
  | { type: "RUN_VOD_DISCOVERY" }
  | { type: "DISCOVER_VOD_FOR_STREAMER"; payload: { streamerId: string } };

export type MessageResponse<T> = { success: true; data: T } | { success: false; error: string };
