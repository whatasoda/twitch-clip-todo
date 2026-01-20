import { LogIn, LogOut } from "lucide-solid";
import { Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Box, Flex } from "../../../styled-system/jsx";
import { useAuth } from "../hooks/use-auth";

export function AuthButton() {
  const { isAuthenticated, isLoading, error, authenticate, logout } = useAuth();

  return (
    <Box>
      <Flex alignItems="center" gap="2">
        <Show
          when={isAuthenticated()}
          fallback={
            <Button size="xs" variant="outline" onClick={authenticate} disabled={isLoading()}>
              <LogIn size={14} />
              <Show when={!isLoading()} fallback="Connecting...">
                Connect Twitch
              </Show>
            </Button>
          }
        >
          <Button size="xs" variant="ghost" onClick={logout} disabled={isLoading()}>
            <LogOut size={14} />
            Disconnect
          </Button>
        </Show>
      </Flex>
      <Show when={error()}>
        <Box fontSize="xs" color="red.11" mt="1">
          {error()?.message}
        </Box>
      </Show>
    </Box>
  );
}
