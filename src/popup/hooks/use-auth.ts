import { createResource, createSignal, onCleanup, onMount } from "solid-js";
import type { PollingState } from "../../infrastructure/twitch-api";
import type { DeviceCodeResponse } from "../../infrastructure/twitch-api/types";
import { STORAGE_KEYS } from "../../shared/constants";
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

async function pollForToken(
  deviceCode: string,
  interval: number,
  deviceInfo: { userCode: string; verificationUri: string; expiresIn: number },
): Promise<void> {
  await sendMessage<unknown>({
    type: "TWITCH_POLL_TOKEN",
    payload: { deviceCode, interval, ...deviceInfo },
  });
}

async function getAuthProgress(): Promise<PollingState | null> {
  return sendMessage<PollingState | null>({ type: "TWITCH_GET_AUTH_PROGRESS" });
}

async function awaitNextPoll(): Promise<void> {
  await sendMessage<null>({ type: "TWITCH_AWAIT_NEXT_POLL" });
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

  // Restore pending auth state from background if polling is in progress
  onMount(async () => {
    const progress = await getAuthProgress();
    if (!progress) return;

    // Check if auth already completed during getAuthProgress() call
    const earlyAuthResult = await getAuthStatus();
    if (earlyAuthResult.isAuthenticated) {
      setStatus("authenticated");
      refetch();
      return;
    }

    // Show loading state (pending without deviceAuth → loading spinner in AuthButton)
    setStatus("pending");

    // Wait for the background's next poll cycle to complete
    await awaitNextPoll();

    // Re-check: did auth complete during the wait?
    const authResult = await getAuthStatus();
    if (authResult.isAuthenticated) {
      setStatus("authenticated");
      refetch();
      return;
    }

    // Still not authenticated — show the device code and link
    const currentProgress = await getAuthProgress();
    if (currentProgress) {
      setDeviceAuth({
        userCode: currentProgress.userCode,
        verificationUri: currentProgress.verificationUri,
      });
    } else {
      // Polling ended (expired/error) during wait
      setStatus("idle");
    }
  });

  // Listen for auth token storage changes to detect background polling completion
  onMount(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (status() !== "pending") return;

      const authChange = changes[STORAGE_KEYS.TWITCH_AUTH];
      if (authChange) {
        if (authChange.newValue) {
          // Token was stored — auth completed
          setStatus("authenticated");
          setDeviceAuth(null);
          refetch();
        } else {
          // Token was removed — auth was cancelled or failed
          setStatus("idle");
          setDeviceAuth(null);
        }
        return;
      }

      const pollingStatusChange = changes[STORAGE_KEYS.AUTH_POLLING_STATUS];
      if ((pollingStatusChange?.newValue as { status?: string } | undefined)?.status === "failed") {
        // Background polling failed (expired, denied, network error, etc.)
        setStatus("idle");
        setDeviceAuth(null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    onCleanup(() => chrome.storage.onChanged.removeListener(listener));
  });

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
      await pollForToken(deviceCodeResponse.device_code, deviceCodeResponse.interval, {
        userCode: deviceCodeResponse.user_code,
        verificationUri: deviceCodeResponse.verification_uri,
        expiresIn: deviceCodeResponse.expires_in,
      });

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
