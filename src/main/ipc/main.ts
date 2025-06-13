// App APIs
import "@/ipc/app/app";
import "@/ipc/app/extensions";
import "@/ipc/app/updates";
import "@/ipc/app/shortcuts";

// Browser APIs
import "@/ipc/browser/browser";
import "@/ipc/browser/tabs";
import "@/ipc/browser/page";
import "@/ipc/browser/navigation";
import "@/ipc/browser/interface";
import "@/ipc/window/omnibox";
import "@/ipc/app/new-tab";

// Session APIs
import "@/ipc/session/profiles";
import "@/ipc/session/spaces";

// Settings APIs
import "@/ipc/window/settings";
import "@/ipc/app/icons";
import "@/ipc/app/open-external";
import "@/ipc/app/onboarding";

// AI APIs
import "@/ipc/ai/handlers";

// Special
import "@/ipc/listeners-manager";

// Debug logging
import { ipcMain } from "electron";
ipcMain.on("debug-log", (event, message) => {
  console.log("[DEBUG FROM RENDERER]", message);
});
