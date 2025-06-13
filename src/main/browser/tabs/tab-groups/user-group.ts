import { BaseTabGroup } from "@/browser/tabs/tab-groups";
import { Tab } from "@/browser/tabs/tab";
import { TabManager } from "@/browser/tabs/tab-manager";
import { Browser } from "@/browser/browser";
import { debugPrint } from "@/modules/output";

export interface UserTabGroupOptions {
  name: string;
  color: string;
  collapsed: boolean;
}

export class UserTabGroup extends BaseTabGroup {
  public name: string;
  public color: string;
  public collapsed: boolean;
  public readonly type = "user";

  constructor(
    browser: Browser,
    tabManager: TabManager,
    id: number,
    initialTabs: [Tab, ...Tab[]],
    options: UserTabGroupOptions
  ) {
    super(browser, tabManager, id, initialTabs);

    this.name = options.name;
    this.color = options.color;
    this.collapsed = options.collapsed;

    debugPrint("TAB_GROUP", `Created user tab group: ${this.name} with ${initialTabs.length} tabs`);
  }

  public setName(name: string): void {
    this.errorIfDestroyed();
    this.name = name;
    debugPrint("TAB_GROUP", `Renamed tab group to: ${name}`);
  }

  public setColor(color: string): void {
    this.errorIfDestroyed();
    this.color = color;
    debugPrint("TAB_GROUP", `Changed tab group color to: ${color}`);
  }

  public setCollapsed(collapsed: boolean): void {
    this.errorIfDestroyed();
    this.collapsed = collapsed;
    
    // Hide/show tabs based on collapsed state
    for (const tab of this.tabs) {
      if (collapsed) {
        tab.hide();
      } else {
        tab.show();
      }
    }
    
    debugPrint("TAB_GROUP", `Tab group ${collapsed ? 'collapsed' : 'expanded'}: ${this.name}`);
  }

  public addTab(tabId: number): boolean {
    const result = super.addTab(tabId);
    
    if (result && this.collapsed) {
      // If group is collapsed, hide the newly added tab
      const tab = this.tabManager.getTabById(tabId);
      if (tab) {
        tab.hide();
      }
    }
    
    return result;
  }

  public getActiveTab(): Tab | null {
    this.errorIfDestroyed();
    
    const visibleTabs = this.tabs.filter(tab => tab.visible);
    if (visibleTabs.length === 0) return null;
    
    // Return the first visible tab or the last active one
    return visibleTabs[0];
  }

  public activateGroup(): void {
    this.errorIfDestroyed();
    
    if (this.collapsed) {
      this.setCollapsed(false);
    }
    
    const activeTab = this.getActiveTab();
    if (activeTab) {
      this.tabManager.setActiveTab(activeTab);
    }
  }

  public moveTab(fromIndex: number, toIndex: number): boolean {
    this.errorIfDestroyed();
    
    if (fromIndex < 0 || fromIndex >= this.tabIds.length || 
        toIndex < 0 || toIndex >= this.tabIds.length) {
      return false;
    }
    
    const tabId = this.tabIds[fromIndex];
    this.tabIds.splice(fromIndex, 1);
    this.tabIds.splice(toIndex, 0, tabId);
    
    debugPrint("TAB_GROUP", `Moved tab within group from ${fromIndex} to ${toIndex}`);
    return true;
  }

  public duplicate(): UserTabGroup | null {
    this.errorIfDestroyed();
    
    try {
      const duplicatedTabs: Tab[] = [];
      
      // Duplicate all tabs in the group
      for (const tab of this.tabs) {
        const newTab = this.tabManager.internalCreateTab(
          this.windowId,
          this.profileId,
          this.spaceId,
          {
            title: tab.title,
            url: tab.url
          }
        );
        
        newTab.loadURL(tab.url);
        duplicatedTabs.push(newTab);
      }
      
      if (duplicatedTabs.length === 0) return null;
      
      // Create new group with duplicated tabs
      const newGroup = new UserTabGroup(
        this.browser,
        this.tabManager,
        this.tabManager.generateTabGroupId(),
        duplicatedTabs as [Tab, ...Tab[]],
        {
          name: `${this.name} (Copy)`,
          color: this.color,
          collapsed: this.collapsed
        }
      );
      
      debugPrint("TAB_GROUP", `Duplicated tab group: ${this.name}`);
      return newGroup;
      
    } catch (error) {
      debugPrint("TAB_GROUP", `Error duplicating tab group: ${error}`);
      return null;
    }
  }

  public closeAllTabs(): void {
    this.errorIfDestroyed();
    
    const tabsToClose = [...this.tabs];
    for (const tab of tabsToClose) {
      tab.destroy();
    }
    
    debugPrint("TAB_GROUP", `Closed all tabs in group: ${this.name}`);
  }

  public pinGroup(): void {
    this.errorIfDestroyed();
    
    for (const tab of this.tabs) {
      tab.setPinned(true);
    }
    
    debugPrint("TAB_GROUP", `Pinned tab group: ${this.name}`);
  }

  public unpinGroup(): void {
    this.errorIfDestroyed();
    
    for (const tab of this.tabs) {
      tab.setPinned(false);
    }
    
    debugPrint("TAB_GROUP", `Unpinned tab group: ${this.name}`);
  }

  public muteGroup(): void {
    this.errorIfDestroyed();
    
    for (const tab of this.tabs) {
      if (tab.audible) {
        tab.setMuted(true);
      }
    }
    
    debugPrint("TAB_GROUP", `Muted tab group: ${this.name}`);
  }

  public unmuteGroup(): void {
    this.errorIfDestroyed();
    
    for (const tab of this.tabs) {
      tab.setMuted(false);
    }
    
    debugPrint("TAB_GROUP", `Unmuted tab group: ${this.name}`);
  }

  public getGroupInfo() {
    this.errorIfDestroyed();
    
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      collapsed: this.collapsed,
      type: this.type,
      tabCount: this.tabs.length,
      windowId: this.windowId,
      spaceId: this.spaceId,
      profileId: this.profileId,
      tabs: this.tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favicon: tab.faviconURL,
        pinned: tab.pinned,
        muted: tab.muted,
        audible: tab.audible
      }))
    };
  }
}
