import { ExternalLink, LogIn, LogOut, X } from "lucide-solid";
import { Match, Show, Switch } from "solid-js";
import { Button } from "@/components/ui/button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Flex, styled } from "../../../styled-system/jsx";
import { useAuth } from "../hooks/use-auth";

const Code = styled("code", {
  base: {
    fontFamily: "monospace",
    fontSize: "lg",
    fontWeight: "bold",
    letterSpacing: "0.1em",
    color: "purple.11",
  },
});

export function AuthButton() {
  const { status, isAuthenticated, isLoading, deviceAuth, error, startAuth, cancelAuth, logout } =
    useAuth();

  const openVerificationUrl = () => {
    const auth = deviceAuth();
    if (auth) {
      window.open(auth.verificationUri, "_blank");
    }
  };

  return (
    <Box>
      <Switch>
        {/* Authenticated state */}
        <Match when={isAuthenticated()}>
          <Button size="xs" variant="ghost" onClick={logout} disabled={isLoading()}>
            <LogOut size={14} />
            {t(MSG.AUTH_DISCONNECT)}
          </Button>
        </Match>

        {/* Pending state - show device code */}
        <Match when={status() === "pending" && deviceAuth()}>
          <Flex direction="column" gap="2" p="2" bg="gray.2" borderRadius="md">
            <Box fontSize="xs" color="gray.11">
              {t(MSG.AUTH_ENTER_CODE)}
            </Box>
            <Code>{deviceAuth()?.userCode}</Code>
            <Flex gap="2">
              <Button size="xs" variant="outline" onClick={openVerificationUrl}>
                <ExternalLink size={12} />
                {t(MSG.AUTH_OPEN_LINK)}
              </Button>
              <Button size="xs" variant="ghost" onClick={cancelAuth}>
                <X size={12} />
                {t(MSG.COMMON_CANCEL)}
              </Button>
            </Flex>
          </Flex>
        </Match>

        {/* Pending state - waiting for device code */}
        <Match when={status() === "pending"}>
          <Button size="xs" variant="outline" disabled>
            <LogIn size={14} />
            {t(MSG.COMMON_LOADING)}
          </Button>
        </Match>

        {/* Idle or error state */}
        <Match when={true}>
          <Button size="xs" variant="outline" onClick={startAuth} disabled={isLoading()}>
            <LogIn size={14} />
            {t(MSG.AUTH_CONNECT_TWITCH)}
          </Button>
        </Match>
      </Switch>

      <Show when={error()}>
        <Box fontSize="xs" color="red.11" mt="1">
          {error()?.message}
        </Box>
      </Show>
    </Box>
  );
}
