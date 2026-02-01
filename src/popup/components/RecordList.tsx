import { createMemo, For, Show } from "solid-js";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import { groupRecordsByStreamer, sortRecordsByDate } from "../../core/record";
import type { VodMetadata } from "../../services/twitch.service";
import type { DiscoveryResult } from "../../services/vod-discovery.service";
import { EmptyState } from "./EmptyState";
import { RecordItem } from "./RecordItem";
import { StreamerGroup } from "./StreamerGroup";
import type { TabValue } from "./TabSwitcher";

interface RecordListProps {
  records: Record[];
  filter: TabValue;
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<DiscoveryResult>;
  onGetRecentVods: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
  onDeleteAll: (streamerId: string) => Promise<unknown>;
}

export function RecordList(props: RecordListProps) {
  const filteredRecords = createMemo(() => {
    if (props.filter === "completed") {
      return props.records
        .filter((r): r is Record & { completedAt: string } => r.completedAt !== null)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    }
    return props.records.filter((r) => r.completedAt === null);
  });

  const groupedRecords = createMemo(() => {
    if (props.filter === "completed") return [];
    const sorted = sortRecordsByDate(filteredRecords());
    const groups = groupRecordsByStreamer(sorted);
    return Array.from(groups.entries()).map(([streamerId, records]) => ({
      streamerId,
      streamerName: records[0]?.streamerName ?? streamerId,
      records: sortRecordsByDate(records),
    }));
  });

  return (
    <Box p="4">
      <Show
        when={filteredRecords().length > 0}
        fallback={
          <EmptyState
            title={props.filter === "completed" ? t(MSG.POPUP_EMPTY_COMPLETED_TITLE) : undefined}
            description={
              props.filter === "completed" ? t(MSG.POPUP_EMPTY_COMPLETED_DESCRIPTION) : undefined
            }
          />
        }
      >
        <Show
          when={props.filter === "pending"}
          fallback={
            <CompletedList
              records={filteredRecords()}
              onUpdateMemo={props.onUpdateMemo}
              onDelete={props.onDelete}
              onOpenClip={props.onOpenClip}
              onFindVod={props.onFindVod}
              onGetRecentVods={props.onGetRecentVods}
              onSelectVod={props.onSelectVod}
            />
          }
        >
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
                onGetRecentVods={props.onGetRecentVods}
                onSelectVod={props.onSelectVod}
                onDeleteAll={props.onDeleteAll}
              />
            )}
          </For>
        </Show>
      </Show>
    </Box>
  );
}

function CompletedList(props: {
  records: Record[];
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<DiscoveryResult>;
  onGetRecentVods: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
}) {
  return (
    <Box borderWidth="1px" borderColor="border.default" borderRadius="md" overflow="hidden">
      <For each={props.records}>
        {(record) => (
          <CompletedRecordItem
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
    </Box>
  );
}

function CompletedRecordItem(props: {
  record: Record;
  onUpdateMemo: (id: string, memo: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onOpenClip: (record: Record) => Promise<unknown>;
  onFindVod: (streamerId: string) => Promise<DiscoveryResult>;
  onGetRecentVods: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
}) {
  return (
    <RecordItem
      record={props.record}
      onUpdateMemo={props.onUpdateMemo}
      onDelete={props.onDelete}
      onOpenClip={props.onOpenClip}
      onFindVod={props.onFindVod}
      onGetRecentVods={props.onGetRecentVods}
      onSelectVod={props.onSelectVod}
      showStreamerName
    />
  );
}
