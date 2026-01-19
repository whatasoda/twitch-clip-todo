// Message types for communication between components

export interface CreateRecordPayload {
  streamerId: string;
  streamerName: string;
  timestampSeconds: number;
  sourceType: "live" | "vod";
  vodId: string | null;
}

export interface LinkVodPayload {
  streamerId: string;
  vodId: string;
  vodStartedAt: string;
}

export type MessageToBackground =
  | { type: "CREATE_RECORD"; payload: CreateRecordPayload }
  | { type: "UPDATE_MEMO"; payload: { id: string; memo: string } }
  | { type: "MARK_COMPLETED"; payload: { id: string } }
  | { type: "DELETE_RECORD"; payload: { id: string } }
  | { type: "GET_RECORDS"; payload: { streamerId?: string } }
  | { type: "LINK_VOD"; payload: LinkVodPayload }
  | { type: "GET_PENDING_COUNT"; payload: { streamerId: string } };

export type MessageResponse<T> = { success: true; data: T } | { success: false; error: string };
