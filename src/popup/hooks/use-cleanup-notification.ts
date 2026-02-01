import { createResource } from "solid-js";
import { sendMessage } from "../../shared/messaging";
import type { CleanupNotification } from "../../shared/types";

async function fetchCleanupNotification(): Promise<CleanupNotification | null> {
  return sendMessage<CleanupNotification | null>({ type: "GET_CLEANUP_NOTIFICATION" });
}

export function useCleanupNotification() {
  const [notification, { refetch }] = createResource(fetchCleanupNotification);

  const dismissNotification = async () => {
    await sendMessage<null>({ type: "DISMISS_CLEANUP_NOTIFICATION" });
    await refetch();
  };

  return {
    notification,
    dismissNotification,
  };
}
