// Message types for communication between components

import type { z } from "zod";
import type {
  createRecordPayloadSchema,
  linkVodPayloadSchema,
  onboardingStateSchema,
} from "./message-schemas";

export type CreateRecordPayload = z.infer<typeof createRecordPayloadSchema>;
export type LinkVodPayload = z.infer<typeof linkVodPayloadSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export interface CleanupNotification {
  count: number;
  timestamp: string;
}

export type MessageToBackground =
  | { type: "CREATE_RECORD"; payload: CreateRecordPayload }
  | { type: "UPDATE_MEMO"; payload: { id: string; memo: string } }
  | { type: "MARK_COMPLETED"; payload: { id: string } }
  | { type: "DELETE_RECORD"; payload: { id: string } }
  | { type: "DELETE_RECORDS_BY_STREAMER"; payload: { streamerId: string } }
  | { type: "DELETE_COMPLETED_RECORDS" }
  | { type: "GET_RECORDS"; payload?: { streamerId?: string } }
  | { type: "LINK_VOD"; payload: LinkVodPayload }
  | { type: "GET_PENDING_COUNT"; payload: { streamerId: string } }
  // Popup
  | { type: "OPEN_POPUP" }
  // Twitch API messages
  | { type: "TWITCH_GET_AUTH_STATUS" }
  | { type: "TWITCH_START_DEVICE_AUTH" }
  | {
      type: "TWITCH_POLL_TOKEN";
      payload: {
        deviceCode: string;
        interval: number;
        userCode: string;
        verificationUri: string;
        expiresIn: number;
      };
    }
  | { type: "TWITCH_GET_AUTH_PROGRESS" }
  | { type: "TWITCH_AWAIT_NEXT_POLL" }
  | { type: "TWITCH_CANCEL_AUTH" }
  | { type: "TWITCH_LOGOUT" }
  | { type: "TWITCH_GET_STREAMER_INFO"; payload: { login: string } }
  | { type: "TWITCH_GET_VOD_METADATA"; payload: { vodId: string } }
  | { type: "TWITCH_GET_CURRENT_STREAM"; payload: { login: string } }
  | { type: "TWITCH_GET_CURRENT_STREAM_CACHED"; payload: { login: string } }
  | { type: "RUN_VOD_DISCOVERY" }
  | { type: "DISCOVER_VOD_FOR_STREAMER"; payload: { streamerId: string } }
  | { type: "GET_RECENT_VODS"; payload: { streamerId: string } }
  // Onboarding
  | { type: "GET_ONBOARDING_STATE" }
  | { type: "UPDATE_ONBOARDING_STATE"; payload: Partial<OnboardingState> }
  // Cleanup notification
  | { type: "GET_CLEANUP_NOTIFICATION" }
  | { type: "DISMISS_CLEANUP_NOTIFICATION" };

export type MessageResponse<T> = { success: true; data: T } | { success: false; error: string };
