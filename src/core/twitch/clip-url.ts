export interface ClipUrlParams {
  vodId?: string;
  broadcastId?: string;
  offsetSeconds: number;
  broadcasterLogin: string;
}

// Twitch clip creation URL format:
// https://clips.twitch.tv/create?broadcasterLogin={login}&offsetSeconds={seconds}&vodID={vodId}
// or with broadcastId instead of vodID
export function buildClipCreationUrl(params: ClipUrlParams): string {
  const searchParams = new URLSearchParams({
    broadcasterLogin: params.broadcasterLogin,
    offsetSeconds: String(params.offsetSeconds),
  });

  // vodId を優先、なければ broadcastId を使用
  if (params.vodId) {
    searchParams.set("vodID", params.vodId);
  } else if (params.broadcastId) {
    searchParams.set("broadcastId", params.broadcastId);
  }

  return `https://clips.twitch.tv/create?${searchParams.toString()}`;
}
