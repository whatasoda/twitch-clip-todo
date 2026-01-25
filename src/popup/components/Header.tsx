import { Badge } from "@/components/ui/badge";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { PageInfo } from "../../core/twitch";
import { AuthButton } from "./AuthButton";

interface HeaderProps {
  pageInfo: PageInfo;
}

export function Header(props: HeaderProps) {
  const title = () => {
    if (props.pageInfo.type === "live" && props.pageInfo.streamerId) {
      return t(MSG.POPUP_WATCHING_STREAMER, props.pageInfo.streamerId);
    }
    if (props.pageInfo.type === "vod" && props.pageInfo.vodId) {
      return t(MSG.POPUP_VOD_LABEL, props.pageInfo.vodId);
    }
    return t(MSG.POPUP_DEFAULT_TITLE);
  };

  return (
    <Box p="4" borderBottomWidth="1px" borderColor="border.default" bg="bg.muted">
      <Flex alignItems="center" justifyContent="space-between" gap="2">
        <HStack gap="2">
          <Box fontWeight="semibold" fontSize="lg">
            {title()}
          </Box>
          {props.pageInfo.type !== "other" && (
            <Badge variant={props.pageInfo.type === "live" ? "solid" : "outline"}>
              {props.pageInfo.type === "live" ? t(MSG.POPUP_BADGE_LIVE) : t(MSG.POPUP_BADGE_VOD)}
            </Badge>
          )}
        </HStack>
        <AuthButton />
      </Flex>
    </Box>
  );
}
