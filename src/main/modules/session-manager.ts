import { app } from "electron";
import { writeFile, readFile, mkdir, readdir, unlink } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
// import { browser } from "@/main/index"; // Will be available at runtime
import { getSettingValueById } from "@/settings/main";
import { debugPrint } from "@/modules/output";

export interface SessionTab {
  id: number;
  title: string;
  url: string;
  faviconURL?: string;
  pinned: boolean;
  muted: boolean;
  position: number;
  groupId?: number;
}

export interface SessionTabGroup {
  id: number;
  name: string;
  color: string;
  collapsed: boolean;
  type: string;
  tabIds: number[];
}

export interface SessionSpace {
  id: string;
  name: string;
  profileId: string;
  tabs: SessionTab[];
  tabGroups: SessionTabGroup[];
  activeTabId?: number;
}

export interface SessionWindow {
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  spaces: SessionSpace[];
  currentSpaceId: string;
}

export interface BrowserSession {
  id: string;
  name: string;
  timestamp: number;
  windows: SessionWindow[];
  activeWindowId?: number;
}

class SessionManager {
  private sessionsDir: string;
  private autoSaveInterval?: NodeJS.Timeout;

  constructor() {
    this.sessionsDir = join(app.getPath("userData"), "sessions");
    this.setupSessionManager();
  }

  private async setupSessionManager() {
    // Create sessions directory if it doesn't exist
    if (!existsSync(this.sessionsDir)) {
      await mkdir(this.sessionsDir, { recursive: true });
    }

    // Setup auto-save if enabled
    const autoSave = getSettingValueById("autoSaveSessions") as boolean;
    if (autoSave) {
      this.startAutoSave();
    }

    debugPrint("SESSION", "Session manager initialized");
  }

  private startAutoSave() {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(async () => {
      try {
        await this.saveCurrentSession("Auto-saved Session");
        debugPrint("SESSION", "Auto-saved current session");
      } catch (error) {
        debugPrint("SESSION", `Auto-save failed: ${error}`);
      }
    }, 5 * 60 * 1000);
  }

  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  public async saveCurrentSession(name: string): Promise<string> {
    const { browser } = await import("@/main/index");
    if (!browser) {
      throw new Error("Browser not initialized");
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const windows = browser.getWindows();
    const sessionWindows: SessionWindow[] = [];

    for (const window of windows) {
      const bounds = window.window.getBounds();
      const spaces = await this.getWindowSpaces(window);
      const currentSpaceId = window.getCurrentSpace() || "";

      sessionWindows.push({
        id: window.id,
        bounds,
        spaces,
        currentSpaceId
      });
    }

    const session: BrowserSession = {
      id: sessionId,
      name,
      timestamp: Date.now(),
      windows: sessionWindows,
      activeWindowId: browser.getFocusedWindow()?.id
    };

    const filePath = join(this.sessionsDir, `${sessionId}.json`);
    await writeFile(filePath, JSON.stringify(session, null, 2));

    debugPrint("SESSION", `Saved session: ${name} (${sessionId})`);
    return sessionId;
  }

  private async getWindowSpaces(window: any): Promise<SessionSpace[]> {
    // This would need to be implemented based on your spaces system
    // For now, return a basic structure
    const { browser } = await import("@/main/index");
    const tabs = browser?.tabs.getTabsByWindow(window.id) || [];
    const sessionTabs: SessionTab[] = tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      faviconURL: tab.faviconURL,
      pinned: tab.pinned,
      muted: tab.muted,
      position: tab.position,
      groupId: tab.groupId || undefined
    }));

    // Get tab groups for this window
    const tabGroups = browser?.tabs.getTabGroupsByWindow(window.id) || [];
    const sessionTabGroups: SessionTabGroup[] = tabGroups.map(group => ({
      id: group.id,
      name: (group as any).name || "Unnamed Group",
      color: (group as any).color || "#blue",
      collapsed: (group as any).collapsed || false,
      type: (group as any).type || "user",
      tabIds: group.tabs.map(tab => tab.id)
    }));

    return [{
      id: window.getCurrentSpace() || "default",
      name: "Default Space",
      profileId: "default",
      tabs: sessionTabs,
      tabGroups: sessionTabGroups,
      activeTabId: browser?.tabs.getActiveTab(window.id, window.getCurrentSpace() || "default")?.id
    }];
  }

  public async restoreSession(sessionId: string): Promise<boolean> {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      const sessionData = await readFile(filePath, 'utf-8');
      const session: BrowserSession = JSON.parse(sessionData);

      const { browser } = await import("@/main/index");
      if (!browser) {
        throw new Error("Browser not initialized");
      }

      // Close existing windows (optional - could be a setting)
      const existingWindows = browser.getWindows();
      for (const window of existingWindows) {
        window.window.close();
      }

      // Restore windows
      for (const sessionWindow of session.windows) {
        const window = await browser.createWindow("normal", {
          bounds: sessionWindow.bounds
        });

        // Restore spaces and tabs
        for (const space of sessionWindow.spaces) {
          await this.restoreSpace(window, space);
        }

        // Set current space
        if (sessionWindow.currentSpaceId) {
          // This would need to be implemented based on your spaces system
          // window.setCurrentSpace(sessionWindow.currentSpaceId);
        }
      }

      debugPrint("SESSION", `Restored session: ${session.name} (${sessionId})`);
      return true;

    } catch (error) {
      debugPrint("SESSION", `Error restoring session: ${error}`);
      return false;
    }
  }

  private async restoreSpace(window: any, space: SessionSpace) {
    const { browser } = await import("@/main/index");
    if (!browser) return;

    // Create tab groups first
    const groupMap = new Map<number, any>();
    for (const groupData of space.tabGroups) {
      // This would need to be implemented based on your tab groups system
      // const group = browser.tabs.createTabGroup("user", [], {
      //   name: groupData.name,
      //   color: groupData.color,
      //   collapsed: groupData.collapsed
      // });
      // groupMap.set(groupData.id, group);
    }

    // Create tabs
    const tabMap = new Map<number, any>();
    for (const tabData of space.tabs) {
      const tab = await browser.tabs.createTab(window.id, space.profileId, space.id, undefined, {
        title: tabData.title,
        position: tabData.position
      });

      tab.loadURL(tabData.url);
      
      if (tabData.pinned) {
        tab.setPinned(true);
      }
      
      if (tabData.muted) {
        tab.setMuted(true);
      }

      tabMap.set(tabData.id, tab);

      // Add to group if needed
      if (tabData.groupId && groupMap.has(tabData.groupId)) {
        const group = groupMap.get(tabData.groupId);
        group.addTab(tab.id);
      }
    }

    // Set active tab
    if (space.activeTabId && tabMap.has(space.activeTabId)) {
      const activeTab = tabMap.get(space.activeTabId);
      browser.tabs.setActiveTab(activeTab);
    }
  }

  public async getSessions(): Promise<BrowserSession[]> {
    try {
      const files = await readdir(this.sessionsDir);
      const sessionFiles = files.filter(file => file.endsWith('.json'));
      const sessions: BrowserSession[] = [];

      for (const file of sessionFiles) {
        try {
          const filePath = join(this.sessionsDir, file);
          const sessionData = await readFile(filePath, 'utf-8');
          const session: BrowserSession = JSON.parse(sessionData);
          sessions.push(session);
        } catch (error) {
          debugPrint("SESSION", `Error reading session file ${file}: ${error}`);
        }
      }

      // Sort by timestamp (newest first)
      sessions.sort((a, b) => b.timestamp - a.timestamp);
      return sessions;

    } catch (error) {
      debugPrint("SESSION", `Error getting sessions: ${error}`);
      return [];
    }
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      await unlink(filePath);
      debugPrint("SESSION", `Deleted session: ${sessionId}`);
      return true;
    } catch (error) {
      debugPrint("SESSION", `Error deleting session: ${error}`);
      return false;
    }
  }

  public async renameSession(sessionId: string, newName: string): Promise<boolean> {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      const sessionData = await readFile(filePath, 'utf-8');
      const session: BrowserSession = JSON.parse(sessionData);
      
      session.name = newName;
      
      await writeFile(filePath, JSON.stringify(session, null, 2));
      debugPrint("SESSION", `Renamed session ${sessionId} to: ${newName}`);
      return true;
    } catch (error) {
      debugPrint("SESSION", `Error renaming session: ${error}`);
      return false;
    }
  }

  public destroy() {
    this.stopAutoSave();
  }
}

export const sessionManager = new SessionManager();
