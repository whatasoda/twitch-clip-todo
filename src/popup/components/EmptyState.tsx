import { Pin } from "lucide-solid";
import { Box, Center, VStack } from "../../../styled-system/jsx";

export function EmptyState() {
  return (
    <Center py="12">
      <VStack gap="4" textAlign="center">
        <Pin size={48} color="var(--colors-fg-muted)" />
        <Box fontSize="lg" fontWeight="semibold">
          No recorded moments yet
        </Box>
        <Box fontSize="sm" color="fg.muted">
          Visit a Twitch stream and press{" "}
          <Box as="kbd" fontFamily="mono" bg="bg.muted" px="1" borderRadius="sm" display="inline">
            Alt+Shift+C
          </Box>{" "}
          or click the pin button to record a moment.
        </Box>
      </VStack>
    </Center>
  );
}
