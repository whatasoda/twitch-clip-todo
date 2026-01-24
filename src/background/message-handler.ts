import type {
  LinkingService,
  RecordService,
  TwitchService,
  VodDiscoveryService,
} from "../services";
import type {
  CreateRecordPayload,
  LinkVodPayload,
  MessageResponse,
  MessageToBackground,
} from "../shared/types";

export interface MessageHandlerDeps {
  recordService: RecordService;
  linkingService: LinkingService;
  twitchService: TwitchService | null;
  vodDiscoveryService: VodDiscoveryService;
}

export async function handleMessage(
  message: MessageToBackground,
  deps: MessageHandlerDeps,
): Promise<MessageResponse<unknown>> {
  const { recordService, linkingService, twitchService, vodDiscoveryService } = deps;

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
        const { deviceCode, interval } = message.payload;
        const token = await twitchService.pollForToken(deviceCode, interval);
        return { success: true, data: token };
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
        const { login } = message.payload as { login: string };
        const info = await twitchService.getStreamerInfo(login);
        return { success: true, data: info };
      }

      case "TWITCH_GET_VOD_METADATA": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const { vodId } = message.payload as { vodId: string };
        const metadata = await twitchService.getVodMetadata(vodId);
        return { success: true, data: metadata };
      }

      case "TWITCH_GET_CURRENT_STREAM": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const { login } = message.payload as { login: string };
        const stream = await twitchService.getCurrentStream(login);
        return { success: true, data: stream };
      }

      case "TWITCH_GET_CURRENT_STREAM_CACHED": {
        if (!twitchService) {
          return { success: true, data: null };
        }
        const { login } = message.payload as { login: string };
        const stream = await twitchService.getCurrentStreamCached(login);
        return { success: true, data: stream };
      }

      case "RUN_VOD_DISCOVERY": {
        const results = await vodDiscoveryService.runDiscovery();
        return { success: true, data: results };
      }

      case "DISCOVER_VOD_FOR_STREAMER": {
        const { streamerId } = message.payload as { streamerId: string };
        const result = await vodDiscoveryService.discoverAndLinkForStreamer(streamerId);
        return { success: true, data: result };
      }

      case "CREATE_RECORD": {
        const record = await recordService.create(message.payload as CreateRecordPayload);
        return { success: true, data: record };
      }

      case "GET_RECORDS": {
        const payload = message.payload as { streamerId?: string } | undefined;
        const records = payload?.streamerId
          ? await recordService.getByStreamerId(payload.streamerId)
          : await recordService.getAll();
        return { success: true, data: records };
      }

      case "UPDATE_MEMO": {
        const { id, memo } = message.payload as { id: string; memo: string };
        const record = await recordService.updateMemo(id, memo);
        return { success: true, data: record };
      }

      case "MARK_COMPLETED": {
        const { id } = message.payload as { id: string };
        const record = await recordService.markCompleted(id);
        return { success: true, data: record };
      }

      case "DELETE_RECORD": {
        const { id } = message.payload as { id: string };
        await recordService.delete(id);
        return { success: true, data: null };
      }

      case "LINK_VOD": {
        const records = await linkingService.linkVod(message.payload as LinkVodPayload);
        return { success: true, data: records };
      }

      case "GET_PENDING_COUNT": {
        const { streamerId } = message.payload as { streamerId: string };
        const count = await recordService.getPendingCount(streamerId);
        return { success: true, data: count };
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
