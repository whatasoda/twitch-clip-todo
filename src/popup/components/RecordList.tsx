import { createMemo, For, Show } from "solid-js";
import { Box } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { groupRecordsByStreamer, sortRecordsByDate } from "../../core/record";
import { EmptyState } from "./EmptyState";
import { StreamerGroup } from "./StreamerGroup";

interface RecordListProps {
  records: Record[];
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<unknown>;
}

export function RecordList(props: RecordListProps) {
  const groupedRecords = createMemo(() => {
    const sorted = sortRecordsByDate(props.records);
    const groups = groupRecordsByStreamer(sorted);
    return Array.from(groups.entries()).map(([streamerId, records]) => ({
      streamerId,
      streamerName: records[0]?.streamerName ?? streamerId,
      records: sortRecordsByDate(records),
    }));
  });

  return (
    <Box p="4">
      <Show when={props.records.length > 0} fallback={<EmptyState />}>
        <For each={groupedRecords()}>
          {(group) => (
            <StreamerGroup
              streamerName={group.streamerName}
              streamerId={group.streamerId}
              records={group.records}
              onUpdateMemo={props.onUpdateMemo}
              onDelete={props.onDelete}
              onOpenClip={props.onOpenClip}
              onFindVod={props.onFindVod}
            />
          )}
        </For>
      </Show>
    </Box>
  );
}
