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
    // vodId を優先、なければ broadcastId を使用
    ...(params.vodId
      ? { vodID: params.vodId }
      : params.broadcastId
        ? { broadcastID: params.broadcastId }
        : {}),
    broadcasterLogin: params.broadcasterLogin,
    offsetSeconds: String(params.offsetSeconds),
  });

  return `https://clips.twitch.tv/create?${searchParams.toString()}`;
}
