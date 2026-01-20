import { STORAGE_KEYS, TWITCH_CLIENT_ID, TWITCH_REDIRECT_URI } from "../../shared/constants";
import type { TwitchAuthToken } from "./types";

// PKCE utilities
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i] as number);
  }
  const base64 = globalThis.btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64UrlEncode(new Uint8Array(hashed));
}

export interface TwitchAuthAPI {
  authenticate(): Promise<TwitchAuthToken>;
  refreshToken(refreshToken: string): Promise<TwitchAuthToken>;
  revokeToken(token: string): Promise<void>;
  getStoredToken(): Promise<TwitchAuthToken | null>;
  storeToken(token: TwitchAuthToken): Promise<void>;
  clearToken(): Promise<void>;
  isTokenExpired(token: TwitchAuthToken): boolean;
}

export function createTwitchAuthAPI(): TwitchAuthAPI {
  return {
    async authenticate(): Promise<TwitchAuthToken> {
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
      authUrl.searchParams.set("client_id", TWITCH_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", TWITCH_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", ""); // Public endpoints only, no scope needed
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");

      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.toString(), interactive: true },
          async (responseUrl) => {
            if (chrome.runtime.lastError || !responseUrl) {
              reject(new Error(chrome.runtime.lastError?.message ?? "Authentication failed"));
              return;
            }

            try {
              const url = new URL(responseUrl);
              const code = url.searchParams.get("code");
              const error = url.searchParams.get("error");

              if (error) {
                reject(new Error(`Twitch auth error: ${error}`));
                return;
              }

              if (!code) {
                reject(new Error("No authorization code received"));
                return;
              }

              // Exchange code for token
              const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: TWITCH_CLIENT_ID,
                  code,
                  code_verifier: codeVerifier,
                  grant_type: "authorization_code",
                  redirect_uri: TWITCH_REDIRECT_URI,
                }),
              });

              if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                reject(
                  new Error(
                    `Token exchange failed: ${errorData.message ?? tokenResponse.statusText}`,
                  ),
                );
                return;
              }

              const tokenData = await tokenResponse.json();
              const token: TwitchAuthToken = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope ?? [],
                token_type: tokenData.token_type,
                obtained_at: Date.now(),
              };

              await this.storeToken(token);
              resolve(token);
            } catch (err) {
              reject(err);
            }
          },
        );
      });
    },

    async refreshToken(refreshToken: string): Promise<TwitchAuthToken> {
      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token refresh failed: ${errorData.message ?? response.statusText}`);
      }

      const tokenData = await response.json();
      const token: TwitchAuthToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope ?? [],
        token_type: tokenData.token_type,
        obtained_at: Date.now(),
      };

      await this.storeToken(token);
      return token;
    },

    async revokeToken(token: string): Promise<void> {
      await fetch("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: TWITCH_CLIENT_ID,
          token,
        }),
      });
    },

    async getStoredToken(): Promise<TwitchAuthToken | null> {
      const result = await chrome.storage.local.get(STORAGE_KEYS.TWITCH_AUTH);
      return (result[STORAGE_KEYS.TWITCH_AUTH] as TwitchAuthToken) ?? null;
    },

    async storeToken(token: TwitchAuthToken): Promise<void> {
      await chrome.storage.local.set({ [STORAGE_KEYS.TWITCH_AUTH]: token });
    },

    async clearToken(): Promise<void> {
      await chrome.storage.local.remove(STORAGE_KEYS.TWITCH_AUTH);
    },

    isTokenExpired(token: TwitchAuthToken): boolean {
      const expiresAt = token.obtained_at + token.expires_in * 1000;
      // Consider expired if less than 5 minutes remaining
      return Date.now() > expiresAt - 5 * 60 * 1000;
    },
  };
}
