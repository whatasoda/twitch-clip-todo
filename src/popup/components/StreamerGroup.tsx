import { ChevronDown, ChevronRight, Search, Trash2 } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import type { VodMetadata } from "../../services/twitch.service";
import { RecordItem } from "./RecordItem";

interface StreamerGroupProps {
  streamerName: string;
  streamerId: string;
  records: Record[];
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onDeleteAll: (streamerId: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<unknown>;
  onGetRecentVods: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
}

export function StreamerGroup(props: StreamerGroupProps) {
  const [isOpen, setIsOpen] = createSignal(true);
  const [isLoading, setIsLoading] = createSignal(false);
  const pendingCount = () => props.records.filter((r) => !r.completedAt).length;
  const unlinkedCount = () =>
    props.records.filter((r) => r.vodId === null && r.broadcastId !== null).length;

  const handleFindVods = async (e: Event) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await props.onFindVod(props.streamerId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async (e: Event) => {
    e.stopPropagation();
    if (confirm(t(MSG.RECORD_DELETE_ALL_CONFIRM))) {
      setIsLoading(true);
      try {
        await props.onDeleteAll(props.streamerId);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Box mb="3" borderWidth="1px" borderColor="border.default" borderRadius="md" overflow="hidden">
      <Flex
        as="button"
        w="full"
        p="3"
        alignItems="center"
        justifyContent="space-between"
        bg="bg.muted"
        cursor="pointer"
        _hover={{ bg: "bg.subtle" }}
        onClick={() => setIsOpen(!isOpen())}
      >
        <Box fontWeight="semibold">{props.streamerName}</Box>
        <HStack gap="2">
          <Show when={unlinkedCount() > 0}>
            <Button size="xs" variant="ghost" onClick={handleFindVods} disabled={isLoading()}>
              <Search size={14} /> {t(MSG.RECORD_FIND_VODS)}
            </Button>
          </Show>
          <Button size="xs" variant="ghost" onClick={handleDeleteAll} disabled={isLoading()}>
            <Trash2 size={14} /> {t(MSG.RECORD_DELETE_ALL)}
          </Button>
          <Show when={pendingCount() > 0}>
            <Badge variant="solid" size="sm">
              {pendingCount()}
            </Badge>
          </Show>
          <Show when={isOpen()} fallback={<ChevronRight size={16} />}>
            <ChevronDown size={16} />
          </Show>
        </HStack>
      </Flex>
      <Show when={isOpen()}>
        <For each={props.records}>
          {(record) => (
            <RecordItem
              record={record}
              onUpdateMemo={props.onUpdateMemo}
              onDelete={props.onDelete}
              onOpenClip={props.onOpenClip}
              onFindVod={props.onFindVod}
              onGetRecentVods={props.onGetRecentVods}
              onSelectVod={props.onSelectVod}
            />
          )}
        </For>
      </Show>
    </Box>
  );
}
