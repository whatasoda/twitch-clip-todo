import { Check, Trash2, Video } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { formatTimestamp } from "../../core/twitch";

interface RecordItemProps {
  record: Record;
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
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
    if (confirm("Delete this record?")) {
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

  const isCompleted = () => props.record.completedAt !== null;
  const canCreateClip = () => props.record.vodId !== null || props.record.broadcastId !== null;

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
        <Box fontWeight="bold" color="accent.default" fontFamily="mono">
          {formatTimestamp(props.record.timestampSeconds)}
        </Box>
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
                    <Video size={14} /> Create Clip
                  </>
                }
              >
                <Check size={14} /> Clipped
              </Show>
            </Button>
          </Show>
          <Show when={!canCreateClip()}>
            <Badge variant="outline" size="sm">
              Not linked
            </Badge>
          </Show>
          <IconButton
            aria-label="Delete record"
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
            {memo() || "Click to add memo..."}
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
            placeholder="Enter memo..."
          />
          <Button size="sm" onClick={handleSaveMemo} disabled={isLoading()}>
            Save
          </Button>
        </HStack>
      </Show>

      <HStack gap="2" mt="2">
        <Box fontSize="xs" color="fg.muted">
          {props.record.sourceType === "live" ? "Live" : "VOD"}
        </Box>
        <Box fontSize="xs" color="fg.muted">
          {new Date(props.record.createdAt).toLocaleString()}
        </Box>
      </HStack>
    </Box>
  );
}
