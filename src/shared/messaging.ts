import type { MessageResponse, MessageToBackground } from "./types";

export async function sendMessage<T>(message: MessageToBackground): Promise<T> {
  const response = await chrome.runtime.sendMessage<MessageToBackground, MessageResponse<T>>(
    message,
  );
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}
