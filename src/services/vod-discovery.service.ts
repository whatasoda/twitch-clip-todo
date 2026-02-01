import type { ChromeAlarmsAPI } from "../infrastructure/chrome/types";
import { VOD_DISCOVERY } from "../shared/constants";
import { logger } from "../shared/logger";
import type { LinkingService } from "./linking.service";
import type { RecordService } from "./record.service";
import type { TwitchService } from "./twitch.service";

const VOD_DISCOVERY_ALARM = "vod-discovery";

export interface VodDiscoveryServiceDeps {
  recordService: RecordService;
  linkingService: LinkingService;
  twitchService: TwitchService;
  alarms: ChromeAlarmsAPI;
}

export interface DiscoveryResult {
  streamerId: string;
  linkedCount: number;
  error?: string;
}

export interface VodDiscoveryService {
  initialize(): void;
  runDiscovery(): Promise<DiscoveryResult[]>;
  discoverAndLinkForStreamer(streamerId: string): Promise<DiscoveryResult>;
}

export function createVodDiscoveryService(deps: VodDiscoveryServiceDeps): VodDiscoveryService {
  const { recordService, linkingService, twitchService, alarms } = deps;

  // Group records by streamerId
  function groupRecordsByStreamer(records: { streamerId: string }[]): Map<string, number> {
    const groups = new Map<string, number>();
    for (const record of records) {
      groups.set(record.streamerId, (groups.get(record.streamerId) ?? 0) + 1);
    }
    return groups;
  }

  return {
    initialize() {
      // Create periodic alarm for VOD discovery
      alarms.create(VOD_DISCOVERY_ALARM, {
        periodInMinutes: VOD_DISCOVERY.INTERVAL_MINUTES,
      });

      // Listen for alarm
      alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === VOD_DISCOVERY_ALARM) {
          this.runDiscovery().catch((error) => {
            logger.error("VOD discovery failed:", error);
          });
        }
      });

      // Run initial discovery after a short delay
      setTimeout(() => {
        this.runDiscovery().catch((error) => {
          logger.error("Initial VOD discovery failed:", error);
        });
      }, 5000);
    },

    async runDiscovery(): Promise<DiscoveryResult[]> {
      // Get all unlinked live records
      const allRecords = await recordService.getAll();
      const unlinkedLive = allRecords.filter(
        (r) => r.sourceType === "live" && r.vodId === null && r.broadcastId !== null,
      );

      if (unlinkedLive.length === 0) {
        return [];
      }

      // Group by streamerId
      const streamerGroups = groupRecordsByStreamer(unlinkedLive);
      const results: DiscoveryResult[] = [];

      for (const streamerId of streamerGroups.keys()) {
        const result = await this.discoverAndLinkForStreamer(streamerId);
        results.push(result);
      }

      return results;
    },

    async discoverAndLinkForStreamer(streamerId: string): Promise<DiscoveryResult> {
      try {
        // Get streamer info (for userId)
        const streamerInfo = await twitchService.getStreamerInfo(streamerId);
        if (!streamerInfo) {
          return { streamerId, linkedCount: 0, error: "Streamer not found" };
        }

        // Fetch recent VODs
        const vods = await twitchService.getRecentVodsByUserId(streamerInfo.id);
        if (vods.length === 0) {
          return { streamerId, linkedCount: 0, error: "No VODs available" };
        }

        let totalLinked = 0;

        // Try to link each VOD
        for (const vod of vods) {
          // Skip VODs without stream_id
          if (!vod.streamId) {
            continue;
          }

          const linked = await linkingService.linkVod({
            vodId: vod.vodId,
            streamerId: vod.streamerId,
            streamId: vod.streamId,
            startedAt: vod.startedAt,
            durationSeconds: vod.durationSeconds,
          });

          totalLinked += linked.length;
        }

        return { streamerId, linkedCount: totalLinked };
      } catch (error) {
        return {
          streamerId,
          linkedCount: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
