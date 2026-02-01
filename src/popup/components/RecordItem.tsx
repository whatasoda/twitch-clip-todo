import { createSignal, Show } from "solid-js";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { formatTimestamp } from "../../core/twitch";
import type { VodMetadata } from "../../services/twitch.service";
import type { DiscoveryResult } from "../../services/vod-discovery.service";
import { RecordActions } from "./RecordActions";
import { RecordMemo } from "./RecordMemo";

interface RecordItemProps {
  record: Record;
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<DiscoveryResult>;
  onGetRecentVods?: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod?: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
  showStreamerName?: boolean;
}

export function RecordItem(props: RecordItemProps) {
  const [isLoading, setIsLoading] = createSignal(false);

  const isCompleted = () => props.record.completedAt !== null;
  const canCreateClip = () => props.record.vodId !== null;
  const canFindVod = () => props.record.broadcastId !== null && props.record.vodId === null;

  const withLoading = (fn: () => Promise<unknown>) => async () => {
    setIsLoading(true);
    try {
      await fn();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      p="3"
      borderBottomWidth="1px"
      borderColor="border.default"
      opacity={isCompleted() ? 0.6 : 1}
      bg="bg.default"
      _hover={{ bg: "bg.muted" }}
    >
      <Flex alignItems="center" justifyContent="space-between" mb="2">
        <HStack gap="2">
          <Show when={props.showStreamerName}>
            <Box fontWeight="semibold" fontSize="sm">
              {props.record.streamerName}
            </Box>
          </Show>
          <Box fontWeight="bold" color="accent.default" fontFamily="mono">
            {formatTimestamp(props.record.timestampSeconds)}
          </Box>
        </HStack>
        <RecordActions
          record={props.record}
          isLoading={isLoading()}
          isCompleted={isCompleted()}
          canCreateClip={canCreateClip()}
          canFindVod={canFindVod()}
          onOpenClip={withLoading(() => props.onOpenClip(props.record))}
          onFindVod={withLoading(() => props.onFindVod(props.record.streamerId))}
          onDelete={withLoading(async () => {
            if (confirm(t(MSG.RECORD_DELETE_CONFIRM))) {
              await props.onDelete(props.record.id);
            }
          })}
          onGetRecentVods={props.onGetRecentVods}
          onSelectVod={props.onSelectVod}
        />
      </Flex>

      <RecordMemo
        memo={props.record.memo}
        onSave={(memo) => props.onUpdateMemo(props.record.id, memo)}
      />

      <HStack gap="2" mt="2">
        <Box fontSize="xs" color="fg.muted">
          {props.record.sourceType === "live" ? t(MSG.POPUP_BADGE_LIVE) : t(MSG.POPUP_BADGE_VOD)}
        </Box>
        <Box fontSize="xs" color="fg.muted">
          {new Date(props.record.createdAt).toLocaleString()}
        </Box>
      </HStack>
    </Box>
  );
}
