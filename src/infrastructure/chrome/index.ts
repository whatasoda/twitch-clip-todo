export * from "./types";
export { createStorageAPI } from "./storage";
export { createRuntimeAPI } from "./runtime";
export { createTabsAPI } from "./tabs";
export { createCommandsAPI } from "./commands";
export { createSidePanelAPI } from "./side-panel";
export { createAlarmsAPI } from "./alarms";

import type { ChromeAPI } from "./types";
import { createStorageAPI } from "./storage";
import { createRuntimeAPI } from "./runtime";
import { createTabsAPI } from "./tabs";
import { createCommandsAPI } from "./commands";
import { createSidePanelAPI } from "./side-panel";
import { createAlarmsAPI } from "./alarms";

export function createChromeAPI(): ChromeAPI {
  return {
    storage: createStorageAPI(),
    runtime: createRuntimeAPI(),
    tabs: createTabsAPI(),
    commands: createCommandsAPI(),
    sidePanel: createSidePanelAPI(),
    alarms: createAlarmsAPI(),
  };
}
