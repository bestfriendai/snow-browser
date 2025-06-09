import { browser } from "@/index";
import { ipcMain } from "electron";

ipcMain.on("browser:load-profile", async (_event, profileId: string) => {
  await browser?.loadProfile(profileId);
});

ipcMain.on("browser:unload-profile", async (_event, profileId: string) => {
  browser?.unloadProfile(profileId);
});

ipcMain.on("browser:create-window", async () => {
  const window = await browser?.createWindow();
  if (window && browser) {
    // Create a new tab with avax.network
    const tab = await browser.tabs.createTab(window.id);
    tab.loadURL("https://avax.network");
    browser.tabs.setActiveTab(tab);
    window.window.focus();
  }
});
