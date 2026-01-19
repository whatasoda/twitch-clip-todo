import type { MessageToBackground, MessageResponse, CreateRecordPayload, LinkVodPayload } from "../shared/types";
import type { Record } from "../core/record";

async function sendMessage<T>(message: MessageToBackground): Promise<T> {
  const response = await chrome.runtime.sendMessage<MessageToBackground, MessageResponse<T>>(message);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function createRecord(payload: CreateRecordPayload): Promise<Record> {
  return sendMessage<Record>({ type: "CREATE_RECORD", payload });
}

export async function updateMemo(id: string, memo: string): Promise<Record> {
  return sendMessage<Record>({ type: "UPDATE_MEMO", payload: { id, memo } });
}

export async function getPendingCount(streamerId: string): Promise<number> {
  return sendMessage<number>({ type: "GET_PENDING_COUNT", payload: { streamerId } });
}

export async function linkVod(payload: LinkVodPayload): Promise<Record[]> {
  return sendMessage<Record[]>({ type: "LINK_VOD", payload });
}

export async function openSidePanel(): Promise<void> {
  await sendMessage<null>({ type: "OPEN_SIDE_PANEL" });
}
