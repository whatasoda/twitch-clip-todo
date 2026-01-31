import { Badge } from "@/components/ui/badge";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex } from "../../../styled-system/jsx";

export type TabValue = "pending" | "completed";

interface TabSwitcherProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  pendingCount: number;
  completedCount: number;
}

export function TabSwitcher(props: TabSwitcherProps) {
  return (
    <Flex borderBottomWidth="1px" borderColor="border.default">
      <TabButton
        label={t(MSG.POPUP_TAB_PENDING)}
        count={props.pendingCount}
        isActive={props.activeTab === "pending"}
        onClick={() => props.onTabChange("pending")}
      />
      <TabButton
        label={t(MSG.POPUP_TAB_COMPLETED)}
        count={props.completedCount}
        isActive={props.activeTab === "completed"}
        onClick={() => props.onTabChange("completed")}
      />
    </Flex>
  );
}

function TabButton(props: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      flex="1"
      py="2"
      px="3"
      textAlign="center"
      fontSize="sm"
      fontWeight={props.isActive ? "semibold" : "normal"}
      color={props.isActive ? "accent.default" : "fg.muted"}
      borderBottomWidth="2px"
      borderColor={props.isActive ? "accent.default" : "transparent"}
      bg="transparent"
      cursor="pointer"
      _hover={{ bg: "bg.muted" }}
      onClick={props.onClick}
    >
      {props.label}
      {props.count > 0 && (
        <Box as="span" ml="2" display="inline-block">
          <Badge variant={props.isActive ? "solid" : "outline"} size="sm">
            {props.count}
          </Badge>
        </Box>
      )}
    </Box>
  );
}
