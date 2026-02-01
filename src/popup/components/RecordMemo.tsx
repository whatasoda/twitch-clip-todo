import { createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, HStack } from "../../../styled-system/jsx";

interface RecordMemoProps {
  memo: string;
  onSave: (memo: string) => Promise<unknown>;
}

export function RecordMemo(props: RecordMemoProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [memo, setMemo] = createSignal(props.memo);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await props.onSave(memo());
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
          placeholder={t(MSG.RECORD_ENTER_MEMO_PLACEHOLDER)}
        />
        <Button size="sm" onClick={handleSave} disabled={isLoading()}>
          {t(MSG.COMMON_SAVE)}
        </Button>
      </HStack>
    </Show>
  );
}
