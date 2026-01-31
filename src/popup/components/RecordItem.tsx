import { Check, Search, Trash2, Video } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { formatTimestamp } from "../../core/twitch";

import type { VodMetadata } from "../../services/twitch.service";
import { VodPicker } from "./VodPicker";

interface RecordItemProps {
  record: Record;
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<unknown>;
  onGetRecentVods?: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod?: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
  showStreamerName?: boolean;
}

export function RecordItem(props: RecordItemProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [memo, setMemo] = createSignal(props.record.memo);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSaveMemo = async () => {
    setIsLoading(true);
    try {
      await props.onUpdateMemo(props.record.id, memo());
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(t(MSG.RECORD_DELETE_CONFIRM))) {
      setIsLoading(true);
      try {
        await props.onDelete(props.record.id);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenClip = async () => {
    setIsLoading(true);
    try {
      await props.onOpenClip(props.record);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindVod = async () => {
    setIsLoading(true);
    try {
      await props.onFindVod(props.record.streamerId);
    } finally {
      setIsLoading(false);
    }
  };

  const isCompleted = () => props.record.completedAt !== null;
  const canCreateClip = () => props.record.vodId !== null;
  const canFindVod = () => props.record.broadcastId !== null && props.record.vodId === null;

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
        <HStack gap="1">
          <Show when={canCreateClip()}>
            <Button
              size="xs"
              variant={isCompleted() ? "outline" : "solid"}
              onClick={handleOpenClip}
              disabled={isLoading()}
            >
              <Show
                when={isCompleted()}
                fallback={
                  <>
                    <Video size={14} /> {t(MSG.RECORD_CREATE_CLIP)}
                  </>
                }
              >
                <Check size={14} /> {t(MSG.RECORD_CLIPPED)}
              </Show>
            </Button>
          </Show>
          <Show when={!canCreateClip() && canFindVod()}>
            <Button size="xs" variant="outline" onClick={handleFindVod} disabled={isLoading()}>
              <Search size={14} /> {t(MSG.RECORD_FIND_VOD)}
            </Button>
          </Show>
          <Show
            when={
              !canCreateClip() &&
              !canFindVod() &&
              props.onGetRecentVods &&
              props.onSelectVod && { getVods: props.onGetRecentVods, selectVod: props.onSelectVod }
            }
          >
            {(fns) => (
              <VodPicker
                record={props.record}
                onGetRecentVods={fns().getVods}
                onSelectVod={fns().selectVod}
              />
            )}
          </Show>
          <Show when={!canCreateClip() && !canFindVod() && !props.onGetRecentVods}>
            <Badge variant="outline" size="sm">
              {t(MSG.RECORD_NO_BROADCAST_ID)}
            </Badge>
          </Show>
          <IconButton
            aria-label={t(MSG.RECORD_DELETE_LABEL)}
            variant="ghost"
            size="xs"
            onClick={handleDelete}
            disabled={isLoading()}
          >
            <Trash2 size={14} />
          </IconButton>
        </HStack>
      </Flex>

      <Show
        when={isEditing()}
        fallback={
          <Box
            fontSize="sm"
            color={memo() ? "fg.default" : "fg.muted"}
            cursor="pointer"
            fontStyle={memo() ? "normal" : "italic"}
            onClick={() => setIsEditing(true)}
          >
            {memo() || t(MSG.RECORD_ADD_MEMO_PLACEHOLDER)}
          </Box>
        }
      >
        <HStack gap="2">
          <Input
            size="sm"
            value={memo()}
            onInput={(e) => setMemo(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveMemo();
              if (e.key === "Escape") setIsEditing(false);
            }}
            placeholder={t(MSG.RECORD_ENTER_MEMO_PLACEHOLDER)}
          />
          <Button size="sm" onClick={handleSaveMemo} disabled={isLoading()}>
            {t(MSG.COMMON_SAVE)}
          </Button>
        </HStack>
      </Show>

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
