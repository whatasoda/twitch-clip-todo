import { Keyboard, MessageSquare, Clock, Link, X } from "lucide-solid";
import { For } from "solid-js";
import { IconButton } from "@/components/ui/icon-button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack, VStack } from "../../../styled-system/jsx";

interface HelpPanelProps {
  onClose: () => void;
}

const helpItems = [
  { icon: Keyboard, key: MSG.HELP_SHORTCUT },
  { icon: MessageSquare, key: MSG.HELP_CHAT_BUTTON },
  { icon: Link, key: MSG.HELP_CONNECT_TWITCH },
  { icon: Clock, key: MSG.HELP_RETENTION },
] as const;

export function HelpPanel(props: HelpPanelProps) {
  return (
    <Box
      position="absolute"
      inset="0"
      bg="bg.canvas"
      zIndex="50"
      overflow="auto"
    >
      <Box p="4" borderBottomWidth="1px" borderColor="border.default" bg="bg.muted">
        <Flex alignItems="center" justifyContent="space-between">
          <Box fontWeight="semibold" fontSize="lg">
            {t(MSG.HELP_TITLE)}
          </Box>
          <IconButton size="sm" variant="ghost" aria-label={t(MSG.HELP_CLOSE)} onClick={props.onClose}>
            <X size={16} />
          </IconButton>
        </Flex>
      </Box>

      <VStack gap="0" alignItems="stretch">
        <For each={helpItems}>
          {(item) => (
            <Box px="4" py="3" borderBottomWidth="1px" borderColor="border.default">
              <HStack gap="3" alignItems="flex-start">
                <item.icon size={16} color="var(--colors-fg-muted)" style={{ "flex-shrink": "0", "margin-top": "2px" }} />
                <Box fontSize="sm">{t(item.key)}</Box>
              </HStack>
            </Box>
          )}
        </For>
      </VStack>
    </Box>
  );
}
