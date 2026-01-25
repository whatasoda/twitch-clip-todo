import { Pin } from "lucide-solid";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Center, VStack } from "../../../styled-system/jsx";

export function EmptyState() {
  return (
    <Center py="12">
      <VStack gap="4" textAlign="center">
        <Pin size={48} color="var(--colors-fg-muted)" />
        <Box fontSize="lg" fontWeight="semibold">
          {t(MSG.POPUP_EMPTY_TITLE)}
        </Box>
        <Box fontSize="sm" color="fg.muted">
          {t(MSG.POPUP_EMPTY_DESCRIPTION)}
        </Box>
      </VStack>
    </Center>
  );
}
