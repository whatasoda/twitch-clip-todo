import { ChevronDown, ChevronRight } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { RecordItem } from "./RecordItem";

interface StreamerGroupProps {
  streamerName: string;
  records: Record[];
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
}

export function StreamerGroup(props: StreamerGroupProps) {
  const [isOpen, setIsOpen] = createSignal(true);
  const pendingCount = () => props.records.filter((r) => !r.completedAt).length;

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
            />
          )}
        </For>
      </Show>
    </Box>
  );
}
