import { Info, X } from "lucide-solid";
import { IconButton } from "@/components/ui/icon-button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack } from "../../../styled-system/jsx";

interface CleanupBannerProps {
  count: number;
  onDismiss: () => void;
}

export function CleanupBanner(props: CleanupBannerProps) {
  return (
    <Box
      mx="4"
      mt="2"
      p="3"
      bg="accent.2"
      borderRadius="md"
      borderWidth="1px"
      borderColor="accent.6"
    >
      <Flex gap="2" justifyContent="space-between" alignItems="center">
        <HStack gap="2" alignItems="center" flex="1">
          <Info size={16} color="var(--colors-accent-11)" style={{ "flex-shrink": "0" }} />
          <Box fontSize="sm">{t(MSG.CLEANUP_BANNER_MESSAGE, String(props.count))}</Box>
        </HStack>
        <IconButton
          size="xs"
          variant="ghost"
          aria-label={t(MSG.HELP_CLOSE)}
          onClick={props.onDismiss}
        >
          <X size={14} />
        </IconButton>
      </Flex>
    </Box>
  );
}
