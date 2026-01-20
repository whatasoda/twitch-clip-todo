import { createResource, createSignal } from "solid-js";
import type { MessageResponse } from "../../shared/types";

interface AuthStatus {
  isAuthenticated: boolean;
}

async function getAuthStatus(): Promise<AuthStatus> {
  const response = (await chrome.runtime.sendMessage({
    type: "TWITCH_GET_AUTH_STATUS",
  })) as MessageResponse<AuthStatus>;

  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

async function authenticate(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "TWITCH_AUTHENTICATE",
  })) as MessageResponse<null>;

  if (!response.success) {
    throw new Error(response.error);
  }
}

async function logout(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "TWITCH_LOGOUT",
  })) as MessageResponse<null>;

  if (!response.success) {
    throw new Error(response.error);
  }
}

export function useAuth() {
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  const [authStatus, { refetch }] = createResource(getAuthStatus);

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authenticate();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Authentication failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logout();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Logout failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated: () => authStatus()?.isAuthenticated ?? false,
    isLoading: () => isLoading() || authStatus.loading,
    error,
    authenticate: handleAuthenticate,
    logout: handleLogout,
    refetch,
  };
}
