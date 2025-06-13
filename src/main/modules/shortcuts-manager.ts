import { app, globalShortcut, BrowserWindow } from "electron";
// import { browser } from "@/main/index"; // Will be available at runtime
import { debugPrint } from "@/modules/output";

export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultShortcut: string;
  action: () => void | Promise<void>;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  description: string;
}

class ShortcutsManager {
  private shortcuts = new Map<string, ShortcutAction>();
  private registeredShortcuts = new Set<string>();

  constructor() {
    this.setupShortcuts();
    this.registerDefaultShortcuts();
  }

  private setupShortcuts() {
    debugPrint("SHORTCUTS", "Shortcuts manager initialized");

    // Clean up shortcuts when app is quitting
    app.on("will-quit", () => {
      this.unregisterAllShortcuts();
    });
  }

  private registerDefaultShortcuts() {
    // Navigation shortcuts
    this.addShortcut({
      id: "new-tab",
      name: "New Tab",
      description: "Open a new tab",
      category: "navigation",
      defaultShortcut: "CmdOrCtrl+T",
      action: async () => {
        const { browser } = await import("@/main/index");
        const window = browser?.getFocusedWindow();
        if (window) {
          const spaceId = window.getCurrentSpace();
          if (spaceId && browser) {
            const tab = await browser.tabs.createTab(window.id, undefined, spaceId);
            browser.tabs.setActiveTab(tab);
          }
        }
      }
    });

    this.addShortcut({
      id: "new-window",
      name: "New Window",
      description: "Open a new browser window",
      category: "navigation",
      defaultShortcut: "CmdOrCtrl+N",
      action: async () => {
        const { browser } = await import("@/main/index");
        if (browser) {
          await browser.createWindow();
        }
      }
    });

    this.addShortcut({
      id: "close-tab",
      name: "Close Tab",
      description: "Close the current tab",
      category: "navigation",
      defaultShortcut: "CmdOrCtrl+W",
      action: async () => {
        const { browser } = await import("@/main/index");
        const window = browser?.getFocusedWindow();
        if (window) {
          const activeTab = browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "");
          if (activeTab) {
            activeTab.destroy();
          }
        }
      }
    });

    this.addShortcut({
      id: "reload-page",
      name: "Reload Page",
      description: "Reload the current page",
      category: "navigation",
      defaultShortcut: "CmdOrCtrl+R",
      action: async () => {
        const { browser } = await import("@/main/index");
        const window = browser?.getFocusedWindow();
        if (window) {
          const activeTab = browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "");
          if (activeTab) {
            activeTab.reload();
          }
        }
      }
    });

    // Focus and productivity shortcuts
    this.addShortcut({
      id: "focus-mode",
      name: "Toggle Focus Mode",
      description: "Enable or disable focus mode",
      category: "productivity",
      defaultShortcut: "CmdOrCtrl+Shift+F",
      action: () => {
        // This would toggle focus mode
        debugPrint("SHORTCUTS", "Focus mode toggled");
      }
    });

    this.addShortcut({
      id: "reading-mode",
      name: "Toggle Reading Mode",
      description: "Enable or disable reading mode",
      category: "productivity",
      defaultShortcut: "CmdOrCtrl+Shift+R",
      action: () => {
        // This would toggle reading mode
        debugPrint("SHORTCUTS", "Reading mode toggled");
      }
    });

    this.addShortcut({
      id: "screenshot",
      name: "Take Screenshot",
      description: "Capture a screenshot of the current page",
      category: "tools",
      defaultShortcut: "CmdOrCtrl+Shift+S",
      action: () => {
        // This would take a screenshot
        debugPrint("SHORTCUTS", "Screenshot taken");
      }
    });

    // Developer shortcuts
    this.addShortcut({
      id: "dev-tools",
      name: "Developer Tools",
      description: "Open developer tools",
      category: "developer",
      defaultShortcut: "F12",
      action: async () => {
        const { browser } = await import("@/main/index");
        const window = browser?.getFocusedWindow();
        if (window) {
          const activeTab = browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "");
          if (activeTab) {
            activeTab.webContents.toggleDevTools();
          }
        }
      }
    });

    this.addShortcut({
      id: "view-source",
      name: "View Source",
      description: "View page source",
      category: "developer",
      defaultShortcut: "CmdOrCtrl+U",
      action: async () => {
        const { browser } = await import("@/main/index");
        const window = browser?.getFocusedWindow();
        if (window) {
          const activeTab = browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "");
          if (activeTab && browser) {
            const sourceTab = browser.tabs.internalCreateTab(window.id, activeTab.profileId, activeTab.spaceId);
            sourceTab.loadURL(`view-source:${activeTab.url}`);
            browser.tabs.setActiveTab(sourceTab);
          }
        }
      }
    });

    // Application shortcuts
    this.addShortcut({
      id: "settings",
      name: "Open Settings",
      description: "Open browser settings",
      category: "application",
      defaultShortcut: "CmdOrCtrl+,",
      action: () => {
        // This would open settings
        debugPrint("SHORTCUTS", "Settings opened");
      }
    });

    this.addShortcut({
      id: "downloads",
      name: "Open Downloads",
      description: "Open downloads manager",
      category: "application",
      defaultShortcut: "CmdOrCtrl+Shift+J",
      action: async () => {
        const { browser } = await import("@/main/index");
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
    });

    this.addShortcut({
      id: "extensions",
      name: "Open Extensions",
      description: "Open extensions manager",
      category: "application",
      defaultShortcut: "CmdOrCtrl+Shift+E",
      action: async () => {
        const { browser } = await import("@/main/index");
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
    });

    // Register all shortcuts
    this.registerAllShortcuts();
  }

  public addShortcut(shortcut: ShortcutAction): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  public removeShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      this.unregisterShortcut(shortcut.defaultShortcut);
      return this.shortcuts.delete(id);
    }
    return false;
  }

  public getShortcut(id: string): ShortcutAction | undefined {
    return this.shortcuts.get(id);
  }

  public getAllShortcuts(): ShortcutAction[] {
    return Array.from(this.shortcuts.values());
  }

  public getShortcutsByCategory(category: string): ShortcutAction[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  public getCategories(): ShortcutCategory[] {
    const categories = new Map<string, ShortcutCategory>();
    
    categories.set("navigation", {
      id: "navigation",
      name: "Navigation",
      description: "Tab and window navigation shortcuts"
    });
    
    categories.set("productivity", {
      id: "productivity",
      name: "Productivity",
      description: "Focus and reading mode shortcuts"
    });
    
    categories.set("tools", {
      id: "tools",
      name: "Tools",
      description: "Browser tools and utilities"
    });
    
    categories.set("developer", {
      id: "developer",
      name: "Developer",
      description: "Development and debugging tools"
    });
    
    categories.set("application", {
      id: "application",
      name: "Application",
      description: "Application-level shortcuts"
    });

    return Array.from(categories.values());
  }

  private registerAllShortcuts(): void {
    for (const shortcut of this.shortcuts.values()) {
      this.registerShortcut(shortcut.defaultShortcut, shortcut.action);
    }
  }

  private registerShortcut(accelerator: string, action: () => void | Promise<void>): boolean {
    try {
      const success = globalShortcut.register(accelerator, action);
      if (success) {
        this.registeredShortcuts.add(accelerator);
        debugPrint("SHORTCUTS", `Registered shortcut: ${accelerator}`);
      } else {
        debugPrint("SHORTCUTS", `Failed to register shortcut: ${accelerator}`);
      }
      return success;
    } catch (error) {
      debugPrint("SHORTCUTS", `Error registering shortcut ${accelerator}: ${error}`);
      return false;
    }
  }

  private unregisterShortcut(accelerator: string): void {
    globalShortcut.unregister(accelerator);
    this.registeredShortcuts.delete(accelerator);
    debugPrint("SHORTCUTS", `Unregistered shortcut: ${accelerator}`);
  }

  private unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll();
    this.registeredShortcuts.clear();
    debugPrint("SHORTCUTS", "All shortcuts unregistered");
  }

  public updateShortcut(id: string, newAccelerator: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    // Unregister old shortcut
    this.unregisterShortcut(shortcut.defaultShortcut);

    // Update and register new shortcut
    shortcut.defaultShortcut = newAccelerator;
    return this.registerShortcut(newAccelerator, shortcut.action);
  }

  public isShortcutRegistered(accelerator: string): boolean {
    return this.registeredShortcuts.has(accelerator);
  }
}

export const shortcutsManager = new ShortcutsManager();
