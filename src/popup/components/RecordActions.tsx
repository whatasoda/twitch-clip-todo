import { Check, Search, Trash2, Video } from "lucide-solid";
import { Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { HStack } from "../../../styled-system/jsx";
import type { Record } from "../../core/record";
import type { VodMetadata } from "../../services/twitch.service";
import { VodPicker } from "./VodPicker";

interface RecordActionsProps {
  record: Record;
  isLoading: boolean;
  isCompleted: boolean;
  canCreateClip: boolean;
  canFindVod: boolean;
  onOpenClip: () => void;
  onFindVod: () => void;
  onDelete: () => void;
  onGetRecentVods?: (streamerId: string) => Promise<VodMetadata[]>;
  onSelectVod?: (record: Record, vodId: string, offsetSeconds: number) => Promise<void>;
}

export function RecordActions(props: RecordActionsProps) {
  return (
    <HStack gap="1">
      <Show when={props.canCreateClip}>
        <Button
          size="xs"
          variant={props.isCompleted ? "outline" : "solid"}
          onClick={props.onOpenClip}
          disabled={props.isLoading}
        >
          <Show
            when={props.isCompleted}
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
      <Show when={!props.canCreateClip && props.canFindVod}>
        <Button size="xs" variant="outline" onClick={props.onFindVod} disabled={props.isLoading}>
          <Search size={14} /> {t(MSG.RECORD_FIND_VOD)}
        </Button>
      </Show>
      <Show
        when={
          !props.canCreateClip &&
          !props.canFindVod &&
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
      <Show when={!props.canCreateClip && !props.canFindVod && !props.onGetRecentVods}>
        <Badge variant="outline" size="sm">
          {t(MSG.RECORD_NO_BROADCAST_ID)}
        </Badge>
      </Show>
      <IconButton
        aria-label={t(MSG.RECORD_DELETE_LABEL)}
        variant="ghost"
        size="xs"
        onClick={props.onDelete}
        disabled={props.isLoading}
      >
        <Trash2 size={14} />
      </IconButton>
    </HStack>
  );
}
