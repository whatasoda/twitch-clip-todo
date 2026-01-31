import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, VStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { formatTimestamp } from "../../core/twitch";
import type { VodMetadata } from "../../services/twitch.service";

interface VodPickerProps {
  record: Record;
  onGetRecentVods: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
}

export function VodPicker(props: VodPickerProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [vods, setVods] = createSignal<VodMetadata[]>([]);
  let containerRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!isOpen()) return;
    const handler = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  const handleOpen = async () => {
    if (isOpen()) {
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await props.onGetRecentVods(props.record.streamerId);
      setVods(result);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (vod: VodMetadata) => {
    if (isLoading()) return;
    setIsLoading(true);
    setIsOpen(false);
    try {
      await props.onSelectVod(props.record, vod.vodId, props.record.timestampSeconds);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box ref={containerRef} position="relative">
      <Button size="xs" variant="outline" onClick={handleOpen} disabled={isLoading()}>
        {isLoading() ? t(MSG.COMMON_LOADING) : t(MSG.RECORD_SELECT_VOD)}
      </Button>
      <Show when={isOpen()}>
        <VodDropdown vods={vods()} onSelect={handleSelect} />
      </Show>
    </Box>
  );
}

function VodDropdown(props: { vods: VodMetadata[]; onSelect: (vod: VodMetadata) => void }) {
  return (
    <Box
      position="absolute"
      right="0"
      top="100%"
      mt="1"
      bg="bg.default"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      shadow="lg"
      zIndex="10"
      maxH="200px"
      overflowY="auto"
      minW="250px"
    >
      <Show
        when={props.vods.length > 0}
        fallback={
          <Box p="3" fontSize="sm" color="fg.muted" textAlign="center">
            {t(MSG.RECORD_NO_VODS_AVAILABLE)}
          </Box>
        }
      >
        <VStack gap="0">
          <For each={props.vods}>
            {(vod) => (
              <Box
                as="button"
                w="full"
                p="2"
                px="3"
                textAlign="left"
                fontSize="xs"
                cursor="pointer"
                _hover={{ bg: "bg.muted" }}
                borderBottomWidth="1px"
                borderColor="border.default"
                onClick={() => props.onSelect(vod)}
              >
                <Box
                  fontWeight="medium"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {vod.title}
                </Box>
                <Box color="fg.muted" mt="0.5">
                  {new Date(vod.startedAt).toLocaleDateString()} ·{" "}
                  {formatTimestamp(vod.durationSeconds)}
                </Box>
              </Box>
            )}
          </For>
        </VStack>
      </Show>
    </Box>
  );
}
