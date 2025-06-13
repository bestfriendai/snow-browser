import { app, WebContents } from "electron";
import { writeFile, readFile, mkdir, readdir, unlink } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { getSettingValueById } from "@/saving/settings";
import { debugPrint } from "@/modules/output";

export interface CustomStylesheet {
  id: string;
  name: string;
  description?: string;
  css: string;
  domains: string[]; // Empty array means apply to all domains
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  author?: string;
  version?: string;
}

export interface StylesheetMatch {
  stylesheet: CustomStylesheet;
  matches: boolean;
  reason: string;
}

class CustomCSSManager {
  private stylesheets = new Map<string, CustomStylesheet>();
  private injectedStyles = new Map<number, Set<string>>(); // webContentsId -> Set of stylesheet IDs
  private stylesheetsDir: string;

  constructor() {
    this.stylesheetsDir = join(app.getPath("userData"), "custom-css");
    this.setupCustomCSS();
  }

  private async setupCustomCSS() {
    // Create custom CSS directory if it doesn't exist
    if (!existsSync(this.stylesheetsDir)) {
      await mkdir(this.stylesheetsDir, { recursive: true });
    }

    // Load existing stylesheets
    await this.loadStylesheets();

    debugPrint("CUSTOM_CSS", "Custom CSS manager initialized");
  }

  private async loadStylesheets() {
    try {
      const files = await readdir(this.stylesheetsDir);
      const cssFiles = files.filter(file => file.endsWith('.json'));

      for (const file of cssFiles) {
        try {
          const filePath = join(this.stylesheetsDir, file);
          const data = await readFile(filePath, 'utf-8');
          const stylesheet: CustomStylesheet = JSON.parse(data);
          this.stylesheets.set(stylesheet.id, stylesheet);
        } catch (error) {
          debugPrint("CUSTOM_CSS", `Error loading stylesheet ${file}: ${error}`);
        }
      }

      debugPrint("CUSTOM_CSS", `Loaded ${this.stylesheets.size} custom stylesheets`);
    } catch (error) {
      debugPrint("CUSTOM_CSS", `Error loading stylesheets: ${error}`);
    }
  }

  public async createStylesheet(stylesheet: Omit<CustomStylesheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    const newStylesheet: CustomStylesheet = {
      ...stylesheet,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.stylesheets.set(id, newStylesheet);
    await this.saveStylesheet(newStylesheet);

    debugPrint("CUSTOM_CSS", `Created stylesheet: ${stylesheet.name}`);
    return id;
  }

  public async updateStylesheet(id: string, updates: Partial<CustomStylesheet>): Promise<boolean> {
    const stylesheet = this.stylesheets.get(id);
    if (!stylesheet) {
      return false;
    }

    const updatedStylesheet: CustomStylesheet = {
      ...stylesheet,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: Date.now()
    };

    this.stylesheets.set(id, updatedStylesheet);
    await this.saveStylesheet(updatedStylesheet);

    // Re-inject if currently applied
    await this.reapplyStylesheets();

    debugPrint("CUSTOM_CSS", `Updated stylesheet: ${updatedStylesheet.name}`);
    return true;
  }

  public async deleteStylesheet(id: string): Promise<boolean> {
    const stylesheet = this.stylesheets.get(id);
    if (!stylesheet) {
      return false;
    }

    // Remove from all web contents
    for (const [webContentsId, injectedIds] of this.injectedStyles.entries()) {
      if (injectedIds.has(id)) {
        // Remove the style from web contents if possible
        injectedIds.delete(id);
      }
    }

    // Delete file
    const filePath = join(this.stylesheetsDir, `${id}.json`);
    try {
      await unlink(filePath);
    } catch (error) {
      debugPrint("CUSTOM_CSS", `Error deleting stylesheet file: ${error}`);
    }

    this.stylesheets.delete(id);

    debugPrint("CUSTOM_CSS", `Deleted stylesheet: ${stylesheet.name}`);
    return true;
  }

  public getStylesheet(id: string): CustomStylesheet | undefined {
    return this.stylesheets.get(id);
  }

  public getAllStylesheets(): CustomStylesheet[] {
    return Array.from(this.stylesheets.values());
  }

  public getEnabledStylesheets(): CustomStylesheet[] {
    return Array.from(this.stylesheets.values()).filter(s => s.enabled);
  }

  public async injectStylesForPage(webContents: WebContents, url: string): Promise<void> {
    const isEnabled = getSettingValueById("enableCustomCSS") as boolean;
    if (!isEnabled) {
      return;
    }

    const domain = this.extractDomain(url);
    const matchingStylesheets = this.getMatchingStylesheets(domain);

    const webContentsId = webContents.id;
    if (!this.injectedStyles.has(webContentsId)) {
      this.injectedStyles.set(webContentsId, new Set());
    }

    const injectedIds = this.injectedStyles.get(webContentsId)!;

    for (const stylesheet of matchingStylesheets) {
      if (stylesheet.enabled && !injectedIds.has(stylesheet.id)) {
        try {
          await webContents.insertCSS(stylesheet.css);
          injectedIds.add(stylesheet.id);
          debugPrint("CUSTOM_CSS", `Injected stylesheet "${stylesheet.name}" into ${domain}`);
        } catch (error) {
          debugPrint("CUSTOM_CSS", `Error injecting stylesheet "${stylesheet.name}": ${error}`);
        }
      }
    }
  }

  public async removeStylesFromPage(webContents: WebContents): Promise<void> {
    const webContentsId = webContents.id;
    const injectedIds = this.injectedStyles.get(webContentsId);

    if (injectedIds) {
      // Note: Electron doesn't provide a way to remove specific CSS,
      // so we'd need to reload the page or use a different approach
      injectedIds.clear();
    }
  }

  private getMatchingStylesheets(domain: string): CustomStylesheet[] {
    return Array.from(this.stylesheets.values()).filter(stylesheet => {
      if (stylesheet.domains.length === 0) {
        return true; // Apply to all domains
      }

      return stylesheet.domains.some(stylesheetDomain => {
        // Support wildcards
        if (stylesheetDomain.startsWith('*.')) {
          const baseDomain = stylesheetDomain.substring(2);
          return domain.endsWith(baseDomain);
        }
        return domain === stylesheetDomain || domain.endsWith('.' + stylesheetDomain);
      });
    });
  }

  public getStylesheetMatches(domain: string): StylesheetMatch[] {
    return Array.from(this.stylesheets.values()).map(stylesheet => {
      let matches = false;
      let reason = '';

      if (stylesheet.domains.length === 0) {
        matches = true;
        reason = 'Applies to all domains';
      } else {
        const matchingDomain = stylesheet.domains.find(stylesheetDomain => {
          if (stylesheetDomain.startsWith('*.')) {
            const baseDomain = stylesheetDomain.substring(2);
            return domain.endsWith(baseDomain);
          }
          return domain === stylesheetDomain || domain.endsWith('.' + stylesheetDomain);
        });

        if (matchingDomain) {
          matches = true;
          reason = `Matches domain pattern: ${matchingDomain}`;
        } else {
          reason = 'No matching domain patterns';
        }
      }

      return { stylesheet, matches, reason };
    });
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  private async saveStylesheet(stylesheet: CustomStylesheet): Promise<void> {
    const filePath = join(this.stylesheetsDir, `${stylesheet.id}.json`);
    await writeFile(filePath, JSON.stringify(stylesheet, null, 2));
  }

  private generateId(): string {
    return `css_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async reapplyStylesheets(): Promise<void> {
    // This would require re-injecting styles to all active web contents
    // For now, we'll just clear the injection tracking
    this.injectedStyles.clear();
  }

  public async importStylesheet(cssContent: string, metadata: {
    name: string;
    description?: string;
    domains?: string[];
    author?: string;
    version?: string;
  }): Promise<string> {
    return await this.createStylesheet({
      name: metadata.name,
      description: metadata.description,
      css: cssContent,
      domains: metadata.domains || [],
      enabled: true,
      author: metadata.author,
      version: metadata.version
    });
  }

  public exportStylesheet(id: string): { stylesheet: CustomStylesheet; css: string } | null {
    const stylesheet = this.stylesheets.get(id);
    if (!stylesheet) {
      return null;
    }

    return {
      stylesheet,
      css: stylesheet.css
    };
  }

  public async createDefaultStylesheets(): Promise<void> {
    // Create some useful default stylesheets
    const defaults = [
      {
        name: "Dark Mode for Light Sites",
        description: "Apply dark mode to websites that don't have it",
        css: `
          html { filter: invert(1) hue-rotate(180deg) !important; }
          img, video, iframe, svg, embed, object { filter: invert(1) hue-rotate(180deg) !important; }
          [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
        `,
        domains: [],
        enabled: false
      },
      {
        name: "Hide Social Media Distractions",
        description: "Hide sidebars and recommended content on social media",
        css: `
          [data-testid*="sidebar"], [aria-label*="sidebar"],
          [class*="recommendation"], [class*="suggested"],
          [class*="trending"], [id*="recommended"] {
            display: none !important;
          }
        `,
        domains: ["facebook.com", "twitter.com", "youtube.com", "reddit.com"],
        enabled: false
      },
      {
        name: "Reading Mode",
        description: "Clean reading experience for articles",
        css: `
          body {
            font-family: Georgia, serif !important;
            line-height: 1.6 !important;
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 20px !important;
          }
          
          article, main, .content, #content {
            max-width: 100% !important;
          }
          
          .sidebar, .comments, .social-share,
          [class*="ad"], [class*="advertisement"] {
            display: none !important;
          }
        `,
        domains: [],
        enabled: false
      }
    ];

    for (const defaultStylesheet of defaults) {
      // Check if it already exists
      const existing = Array.from(this.stylesheets.values()).find(s => s.name === defaultStylesheet.name);
      if (!existing) {
        await this.createStylesheet(defaultStylesheet);
      }
    }
  }

  public getStatistics(): {
    totalStylesheets: number;
    enabledStylesheets: number;
    globalStylesheets: number;
    domainSpecificStylesheets: number;
  } {
    const all = Array.from(this.stylesheets.values());
    
    return {
      totalStylesheets: all.length,
      enabledStylesheets: all.filter(s => s.enabled).length,
      globalStylesheets: all.filter(s => s.domains.length === 0).length,
      domainSpecificStylesheets: all.filter(s => s.domains.length > 0).length
    };
  }
}

export const customCSSManager = new CustomCSSManager();
