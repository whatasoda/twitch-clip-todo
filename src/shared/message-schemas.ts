import { z } from "zod";

export const createRecordPayloadSchema = z.object({
  streamerId: z.string(),
  streamerName: z.string(),
  timestampSeconds: z.number(),
  sourceType: z.enum(["live", "vod"]),
  vodId: z.string().nullable(),
  broadcastId: z.string().nullable(),
  memo: z.string().optional(),
});

export const linkVodPayloadSchema = z.object({
  vodId: z.string(),
  streamerId: z.string(),
  streamId: z.string(),
  startedAt: z.string(),
  durationSeconds: z.number(),
});

export const onboardingStateSchema = z.object({
  hasSeenTwitchToast: z.boolean(),
  hasSeenFirstRecordHint: z.boolean(),
});

export const idPayloadSchema = z.object({
  id: z.string(),
});

export const loginPayloadSchema = z.object({
  login: z.string(),
});

export const vodIdPayloadSchema = z.object({
  vodId: z.string(),
});

export const streamerIdPayloadSchema = z.object({
  streamerId: z.string(),
});

export const memoPayloadSchema = z.object({
  id: z.string(),
  memo: z.string(),
});

export const pollTokenPayloadSchema = z.object({
  deviceCode: z.string(),
  interval: z.number(),
});

export const getRecordsPayloadSchema = z
  .object({
    streamerId: z.string().optional(),
  })
  .optional();
