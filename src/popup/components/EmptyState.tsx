import { Pin } from "lucide-solid";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Center, VStack } from "../../../styled-system/jsx";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <Center py="12">
      <VStack gap="4" textAlign="center">
        <Pin size={48} color="var(--colors-fg-muted)" />
        <Box fontSize="lg" fontWeight="semibold">
          {props.title ?? t(MSG.POPUP_EMPTY_TITLE)}
        </Box>
        <Box fontSize="sm" color="fg.muted">
          {props.description ?? t(MSG.POPUP_EMPTY_DESCRIPTION)}
        </Box>
      </VStack>
    </Center>
  );
}
