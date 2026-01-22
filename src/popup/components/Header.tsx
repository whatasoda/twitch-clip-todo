import { Badge } from "@/components/ui/badge";
import { Box, Flex, HStack } from "../../../styled-system/jsx";
import type { PageInfo } from "../../core/twitch";
import { AuthButton } from "./AuthButton";

interface HeaderProps {
  pageInfo: PageInfo;
}

export function Header(props: HeaderProps) {
  const title = () => {
    if (props.pageInfo.type === "live" && props.pageInfo.streamerId) {
      return `Watching: ${props.pageInfo.streamerId}`;
    }
    if (props.pageInfo.type === "vod" && props.pageInfo.vodId) {
      return `VOD: ${props.pageInfo.vodId}`;
    }
    return "Twitch Clip Todo";
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
              {props.pageInfo.type === "live" ? "Live" : "VOD"}
            </Badge>
          )}
        </HStack>
        <AuthButton />
      </Flex>
    </Box>
  );
}
