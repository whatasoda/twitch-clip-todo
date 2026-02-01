import type { ZodType } from "zod";
import type { ChromeStorageAPI } from "../infrastructure/chrome/types";
import type {
  LinkingService,
  RecordService,
  TwitchService,
  VodDiscoveryService,
} from "../services";
import { STORAGE_KEYS } from "../shared/constants";
import {
  createRecordPayloadSchema,
  getRecordsPayloadSchema,
  idPayloadSchema,
  linkVodPayloadSchema,
  loginPayloadSchema,
  memoPayloadSchema,
  onboardingStateSchema,
  pollTokenPayloadSchema,
  streamerIdPayloadSchema,
  vodIdPayloadSchema,
} from "../shared/message-schemas";
import type {
  CleanupNotification,
  MessageResponse,
  MessageToBackground,
  OnboardingState,
} from "../shared/types";

export interface MessageHandlerDeps {
  recordService: RecordService;
  linkingService: LinkingService;
  twitchService: TwitchService | null;
  vodDiscoveryService: VodDiscoveryService;
  storage: ChromeStorageAPI;
}

function validatePayload<T extends ZodType>(
  schema: T,
  data: unknown,
): MessageResponse<never> | { success: true; data: T["_output"] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: `Invalid payload: ${result.error.message}` };
  }
  return { success: true, data: result.data };
}

export async function handleMessage(
  message: MessageToBackground,
  deps: MessageHandlerDeps,
): Promise<MessageResponse<unknown>> {
  const { recordService, linkingService, twitchService, vodDiscoveryService, storage } = deps;

  try {
    switch (message.type) {
      // Twitch API messages
      case "TWITCH_GET_AUTH_STATUS": {
        const isAuthenticated = twitchService ? await twitchService.isAuthenticated() : false;
        return { success: true, data: { isAuthenticated } };
      }

      case "TWITCH_START_DEVICE_AUTH": {
        if (!twitchService) {
          return { success: false, error: "Twitch service not initialized" };
        }
        const deviceCodeResponse = await twitchService.startDeviceAuth();
        return { success: true, data: deviceCodeResponse };
      }

      case "TWITCH_POLL_TOKEN": {
        if (!twitchService) {
          return { success: false, error: "Twitch service not initialized" };
        }
        const parsed = validatePayload(pollTokenPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const token = await twitchService.pollForToken(
          parsed.data.deviceCode,
          parsed.data.interval,
          {
            userCode: parsed.data.userCode,
            verificationUri: parsed.data.verificationUri,
            expiresIn: parsed.data.expiresIn,
          },
        );
        return { success: true, data: token };
      }

      case "TWITCH_GET_AUTH_PROGRESS": {
        const progress = twitchService ? twitchService.getAuthProgress() : null;
        return { success: true, data: progress };
      }

      case "TWITCH_AWAIT_NEXT_POLL": {
        if (twitchService) {
          await twitchService.awaitNextPoll();
        }
        return { success: true, data: null };
      }

      case "TWITCH_CANCEL_AUTH": {
        if (!twitchService) {
          return { success: false, error: "Twitch service not initialized" };
        }
        twitchService.cancelAuth();
        return { success: true, data: null };
      }

      case "TWITCH_LOGOUT": {
        if (!twitchService) {
          return { success: false, error: "Twitch service not initialized" };
        }
        await twitchService.logout();
        return { success: true, data: null };
      }

      case "TWITCH_GET_STREAMER_INFO": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const parsed = validatePayload(loginPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const info = await twitchService.getStreamerInfo(parsed.data.login);
        return { success: true, data: info };
      }

      case "TWITCH_GET_VOD_METADATA": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const parsed = validatePayload(vodIdPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const metadata = await twitchService.getVodMetadata(parsed.data.vodId);
        return { success: true, data: metadata };
      }

      case "TWITCH_GET_CURRENT_STREAM": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const parsed = validatePayload(loginPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const stream = await twitchService.getCurrentStream(parsed.data.login);
        return { success: true, data: stream };
      }

      case "TWITCH_GET_CURRENT_STREAM_CACHED": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const parsed = validatePayload(loginPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const stream = await twitchService.getCurrentStreamCached(parsed.data.login);
        return { success: true, data: stream };
      }

      case "RUN_VOD_DISCOVERY": {
        const results = await vodDiscoveryService.runDiscovery();
        return { success: true, data: results };
      }

      case "DISCOVER_VOD_FOR_STREAMER": {
        const parsed = validatePayload(streamerIdPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const result = await vodDiscoveryService.discoverAndLinkForStreamer(parsed.data.streamerId);
        return { success: true, data: result };
      }

      case "GET_RECENT_VODS": {
        if (!twitchService) {
          return { success: true, data: [] };
        }
        const parsed = validatePayload(streamerIdPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const streamerInfo = await twitchService.getStreamerInfo(parsed.data.streamerId);
        if (!streamerInfo) {
          return { success: true, data: [] };
        }
        const vods = await twitchService.getRecentVodsByUserId(streamerInfo.id);
        return { success: true, data: vods };
      }

      case "CREATE_RECORD": {
        const parsed = validatePayload(createRecordPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const record = await recordService.create(parsed.data);
        return { success: true, data: record };
      }

      case "GET_RECORDS": {
        const parsed = validatePayload(getRecordsPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const records = parsed.data?.streamerId
          ? await recordService.getByStreamerId(parsed.data.streamerId)
          : await recordService.getAll();
        return { success: true, data: records };
      }

      case "UPDATE_MEMO": {
        const parsed = validatePayload(memoPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const record = await recordService.updateMemo(parsed.data.id, parsed.data.memo);
        return { success: true, data: record };
      }

      case "MARK_COMPLETED": {
        const parsed = validatePayload(idPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const record = await recordService.markCompleted(parsed.data.id);
        return { success: true, data: record };
      }

      case "DELETE_RECORD": {
        const parsed = validatePayload(idPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        await recordService.delete(parsed.data.id);
        return { success: true, data: null };
      }

      case "DELETE_RECORDS_BY_STREAMER": {
        const parsed = validatePayload(streamerIdPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const deleted = await recordService.deleteByStreamerId(parsed.data.streamerId);
        return { success: true, data: deleted };
      }

      case "DELETE_COMPLETED_RECORDS": {
        const deleted = await recordService.deleteCompleted();
        return { success: true, data: deleted };
      }

      case "LINK_VOD": {
        const parsed = validatePayload(linkVodPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const records = await linkingService.linkVod(parsed.data);
        return { success: true, data: records };
      }

      case "GET_PENDING_COUNT": {
        const parsed = validatePayload(streamerIdPayloadSchema, message.payload);
        if (!parsed.success) return parsed;
        const count = await recordService.getPendingCount(parsed.data.streamerId);
        return { success: true, data: count };
      }

      // Onboarding
      case "GET_ONBOARDING_STATE": {
        const defaultState: OnboardingState = {
          hasSeenTwitchToast: false,
          hasSeenFirstRecordHint: false,
        };
        const state = await storage.get<OnboardingState>(STORAGE_KEYS.ONBOARDING);
        return { success: true, data: state ?? defaultState };
      }

      case "UPDATE_ONBOARDING_STATE": {
        const defaultState: OnboardingState = {
          hasSeenTwitchToast: false,
          hasSeenFirstRecordHint: false,
        };
        const current = await storage.get<OnboardingState>(STORAGE_KEYS.ONBOARDING);
        const parsed = validatePayload(onboardingStateSchema.partial(), message.payload);
        if (!parsed.success) return parsed;
        const updated = { ...(current ?? defaultState), ...parsed.data };
        await storage.set(STORAGE_KEYS.ONBOARDING, updated);
        return { success: true, data: updated };
      }

      // Cleanup notification
      case "GET_CLEANUP_NOTIFICATION": {
        const notification = await storage.get<CleanupNotification>(
          STORAGE_KEYS.CLEANUP_NOTIFICATION,
        );
        return { success: true, data: notification };
      }

      case "DISMISS_CLEANUP_NOTIFICATION": {
        await storage.remove(STORAGE_KEYS.CLEANUP_NOTIFICATION);
        await chrome.action.setBadgeText({ text: "" });
        return { success: true, data: null };
      }

      default:
        return { success: false, error: "Unknown message type" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
