import { createResource, createSignal } from "solid-js";
import type { DeviceCodeResponse } from "../../infrastructure/twitch-api/types";
import { sendMessage } from "../../shared/messaging";

export type AuthStatus = "idle" | "pending" | "authenticated" | "error";

interface AuthCheckResult {
  isAuthenticated: boolean;
}

interface DeviceAuthState {
  userCode: string;
  verificationUri: string;
}

async function getAuthStatus(): Promise<AuthCheckResult> {
  return sendMessage<AuthCheckResult>({ type: "TWITCH_GET_AUTH_STATUS" });
}

async function startDeviceAuth(): Promise<DeviceCodeResponse> {
  return sendMessage<DeviceCodeResponse>({ type: "TWITCH_START_DEVICE_AUTH" });
}

async function pollForToken(deviceCode: string, interval: number): Promise<void> {
  await sendMessage<unknown>({
    type: "TWITCH_POLL_TOKEN",
    payload: { deviceCode, interval },
  });
}

async function cancelAuth(): Promise<void> {
  await sendMessage<null>({ type: "TWITCH_CANCEL_AUTH" });
}

async function logout(): Promise<void> {
  await sendMessage<null>({ type: "TWITCH_LOGOUT" });
}

export function useAuth() {
  const [status, setStatus] = createSignal<AuthStatus>("idle");
  const [deviceAuth, setDeviceAuth] = createSignal<DeviceAuthState | null>(null);
  const [error, setError] = createSignal<Error | null>(null);

  const [authCheck, { refetch }] = createResource(getAuthStatus);

  // Initialize status based on auth check
  const isAuthenticated = () => {
    const check = authCheck();
    if (check?.isAuthenticated) {
      if (status() !== "authenticated") {
        setStatus("authenticated");
      }
      return true;
    }
    return false;
  };

  const handleStartAuth = async () => {
    setStatus("pending");
    setError(null);
    setDeviceAuth(null);

    try {
      // Step 1: Get device code
      const deviceCodeResponse = await startDeviceAuth();

      setDeviceAuth({
        userCode: deviceCodeResponse.user_code,
        verificationUri: deviceCodeResponse.verification_uri,
      });

      // Step 2: Start polling for token (this will block until user authorizes or times out)
      await pollForToken(deviceCodeResponse.device_code, deviceCodeResponse.interval);

      // Success - user authorized
      setStatus("authenticated");
      setDeviceAuth(null);
      await refetch();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Authentication failed");

      // Don't set error for cancellation
      if (errorObj.name === "AbortError" || errorObj.message.includes("cancelled")) {
        setStatus("idle");
      } else {
        setStatus("error");
        setError(errorObj);
      }
      setDeviceAuth(null);
    }
  };

  const handleCancelAuth = async () => {
    await cancelAuth();
    setStatus("idle");
    setDeviceAuth(null);
    setError(null);
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
      setStatus("idle");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Logout failed"));
    }
  };

  return {
    status,
    isAuthenticated,
    isLoading: () => authCheck.loading || status() === "pending",
    deviceAuth,
    error,
    startAuth: handleStartAuth,
    cancelAuth: handleCancelAuth,
    logout: handleLogout,
    refetch,
  };
}
