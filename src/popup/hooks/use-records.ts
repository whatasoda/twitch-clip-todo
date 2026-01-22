import { createResource, onCleanup, onMount } from "solid-js";
import type { Record } from "../../core/record";
import type { MessageResponse } from "../../shared/types";

async function fetchRecords(): Promise<Record[]> {
  const response = await chrome.runtime.sendMessage<unknown, MessageResponse<Record[]>>({
    type: "GET_RECORDS",
  });
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

export function useRecords() {
  const [records, { refetch, mutate }] = createResource(fetchRecords);

  // Listen for storage changes to auto-refresh
  onMount(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.records) {
        refetch();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    onCleanup(() => chrome.storage.onChanged.removeListener(listener));
  });

  return {
    records,
    refetch,
    mutate,
    loading: () => records.loading,
    error: () => records.error,
  };
}
