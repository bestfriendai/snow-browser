import { MenuItemConstructorOptions } from "electron";
import { Browser } from "@/browser/browser";
import { getCurrentShortcut } from "@/modules/shortcuts";

export const createToolsMenu = (browser: Browser): MenuItemConstructorOptions => ({
  label: "Tools",
  submenu: [
    {
      label: "Downloads",
      accelerator: getCurrentShortcut("downloads") || "CmdOrCtrl+Shift+J",
      click: async () => {
        const window = browser?.getFocusedWindow();
        if (window && browser) {
          const spaceId = window.getCurrentSpace();
          if (spaceId) {
            const tab = await browser.tabs.createTab(window.id, undefined, spaceId);
            tab.loadURL("snow://downloads");
            browser.tabs.setActiveTab(tab);
          }
        }
      }
    },
    {
      label: "Extensions",
      accelerator: getCurrentShortcut("extensions") || "CmdOrCtrl+Shift+E",
      click: async () => {
        const window = browser?.getFocusedWindow();
        if (window && browser) {
          const spaceId = window.getCurrentSpace();
          if (spaceId) {
            const tab = await browser.tabs.createTab(window.id, undefined, spaceId);
            tab.loadURL("snow://extensions");
            browser.tabs.setActiveTab(tab);
          }
        }
      }
    },
    { type: "separator" },
    {
      label: "Focus Mode",
      accelerator: getCurrentShortcut("focus-mode") || "CmdOrCtrl+Shift+F",
      click: () => {
        // Toggle focus mode - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("toggle-focus-mode");
        }
      }
    },
    {
      label: "Reading Mode",
      accelerator: getCurrentShortcut("reading-mode") || "CmdOrCtrl+Shift+R",
      click: () => {
        // Toggle reading mode - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("toggle-reading-mode");
        }
      }
    },
    { type: "separator" },
    {
      label: "Take Screenshot",
      accelerator: getCurrentShortcut("screenshot") || "CmdOrCtrl+Shift+S",
      click: () => {
        // Take screenshot - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("take-screenshot");
        }
      }
    },
    { type: "separator" },
    {
      label: "Password Manager",
      click: () => {
        // Open password manager - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("open-password-manager");
        }
      }
    },
    {
      label: "Bookmarks Manager",
      click: () => {
        // Open bookmarks manager - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("open-bookmarks-manager");
        }
      }
    },
    {
      label: "History Manager",
      click: () => {
        // Open history manager - this would be implemented in the renderer
        const window = browser?.getFocusedWindow();
        if (window) {
          window.window.webContents.send("open-history-manager");
        }
      }
    },
    { type: "separator" },
    {
      label: "Developer Tools",
      accelerator: getCurrentShortcut("tab.toggleDevTools") || "F12",
      click: () => {
        const window = browser?.getFocusedWindow();
        if (window) {
          const activeTab = browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "");
          if (activeTab && activeTab.webContents) {
            activeTab.webContents.toggleDevTools();
          }
        }
      }
    }
  ]
});
