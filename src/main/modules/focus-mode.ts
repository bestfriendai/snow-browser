import { WebContents, BrowserWindow } from "electron";
import { getSettingValueById } from "@/saving/settings";
import { debugPrint } from "@/modules/output";

export interface FocusModeOptions {
  hideNotifications: boolean;
  blockSocialMedia: boolean;
  blockNews: boolean;
  blockShopping: boolean;
  hideComments: boolean;
  hideAds: boolean;
  simplifyUI: boolean;
  enableTimer: boolean;
  timerDuration: number; // in minutes
}

export interface FocusSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number; // planned duration in minutes
  websitesBlocked: string[];
  elementsHidden: string[];
  active: boolean;
}

class FocusModeManager {
  private activeSessions = new Map<number, FocusSession>(); // webContentsId -> session
  private blockedDomains = new Set<string>();
  private focusCSS: string;

  constructor() {
    this.setupFocusMode();
    this.initializeFocusCSS();
  }

  private setupFocusMode() {
    debugPrint("FOCUS_MODE", "Focus mode manager initialized");
  }

  private initializeFocusCSS() {
    // CSS to hide distracting elements
    this.focusCSS = `
      /* Hide common distracting elements */
      .focus-mode-hidden {
        display: none !important;
      }
      
      /* Social media distractions */
      [class*="sidebar"], [class*="recommendation"], [class*="suggested"],
      [class*="trending"], [class*="popular"], [id*="sidebar"],
      [id*="recommendation"], [id*="suggested"], [id*="trending"] {
        opacity: 0.3 !important;
        pointer-events: none !important;
      }
      
      /* Comments sections */
      [class*="comment"], [class*="discussion"], [id*="comment"],
      [id*="discussion"], .comments, #comments {
        display: none !important;
      }
      
      /* Ads and promotional content */
      [class*="ad"], [class*="advertisement"], [class*="promo"],
      [class*="sponsored"], [id*="ad"], [id*="advertisement"],
      iframe[src*="ads"], iframe[src*="doubleclick"] {
        display: none !important;
      }
      
      /* Social sharing buttons */
      [class*="share"], [class*="social"], .social-buttons,
      .share-buttons, [data-share] {
        opacity: 0.5 !important;
      }
      
      /* Notification banners */
      [class*="notification"], [class*="banner"], [class*="alert"],
      [role="alert"], [role="banner"] {
        display: none !important;
      }
      
      /* Simplified reading experience */
      body.focus-mode {
        font-family: Georgia, serif !important;
        line-height: 1.6 !important;
        max-width: 800px !important;
        margin: 0 auto !important;
        padding: 20px !important;
        background: #fafafa !important;
        color: #333 !important;
      }
      
      body.focus-mode * {
        max-width: 100% !important;
      }
      
      /* Hide video autoplay */
      video {
        pointer-events: none !important;
      }
      
      video[autoplay] {
        display: none !important;
      }
    `;
  }

  public async enableFocusMode(webContents: WebContents, options: Partial<FocusModeOptions> = {}): Promise<string> {
    const isEnabled = getSettingValueById("enableFocusMode") as boolean;
    if (!isEnabled) {
      throw new Error("Focus mode is disabled in settings");
    }

    const defaultOptions: FocusModeOptions = {
      hideNotifications: true,
      blockSocialMedia: true,
      blockNews: false,
      blockShopping: false,
      hideComments: true,
      hideAds: true,
      simplifyUI: true,
      enableTimer: false,
      timerDuration: 25 // Pomodoro default
    };

    const finalOptions = { ...defaultOptions, ...options };
    const sessionId = this.generateSessionId();

    const session: FocusSession = {
      id: sessionId,
      startTime: Date.now(),
      duration: finalOptions.timerDuration,
      websitesBlocked: [],
      elementsHidden: [],
      active: true
    };

    this.activeSessions.set(webContents.id, session);

    // Apply focus mode styles
    await this.applyFocusStyles(webContents, finalOptions);

    // Setup content blocking
    if (finalOptions.blockSocialMedia) {
      this.setupSocialMediaBlocking(webContents);
    }

    // Setup timer if enabled
    if (finalOptions.enableTimer) {
      this.setupFocusTimer(webContents, finalOptions.timerDuration);
    }

    debugPrint("FOCUS_MODE", `Focus mode enabled for session: ${sessionId}`);
    return sessionId;
  }

  public async disableFocusMode(webContents: WebContents): Promise<boolean> {
    const session = this.activeSessions.get(webContents.id);
    if (!session) {
      return false;
    }

    session.active = false;
    session.endTime = Date.now();

    // Remove focus mode styles
    await this.removeFocusStyles(webContents);

    this.activeSessions.delete(webContents.id);

    debugPrint("FOCUS_MODE", `Focus mode disabled for session: ${session.id}`);
    return true;
  }

  private async applyFocusStyles(webContents: WebContents, options: FocusModeOptions) {
    try {
      await webContents.insertCSS(this.focusCSS);

      // Apply additional customizations based on options
      let customCSS = '';

      if (options.hideComments) {
        customCSS += `
          [class*="comment"], [class*="discussion"], 
          #comments, .comments, .comment-section {
            display: none !important;
          }
        `;
      }

      if (options.hideNotifications) {
        customCSS += `
          [class*="notification"], [class*="toast"], 
          [class*="alert"], [role="alert"] {
            display: none !important;
          }
        `;
      }

      if (options.simplifyUI) {
        customCSS += `
          body { 
            font-family: Georgia, serif !important;
            line-height: 1.6 !important;
          }
          
          main, article, .content, #content {
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 20px !important;
          }
        `;
      }

      if (customCSS) {
        await webContents.insertCSS(customCSS);
      }

      // Add focus mode class to body
      await webContents.executeJavaScript(`
        document.body.classList.add('focus-mode');
        
        // Hide specific distracting elements
        const distractingSelectors = [
          '[class*="sidebar"]',
          '[class*="recommendation"]',
          '[class*="suggested"]',
          '[class*="trending"]',
          '.social-buttons',
          '.share-buttons',
          '[data-testid*="sidebar"]'
        ];
        
        distractingSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.classList.add('focus-mode-hidden'));
        });
      `);

    } catch (error) {
      debugPrint("FOCUS_MODE", `Error applying focus styles: ${error}`);
    }
  }

  private async removeFocusStyles(webContents: WebContents) {
    try {
      await webContents.executeJavaScript(`
        document.body.classList.remove('focus-mode');
        
        // Remove focus mode hidden class
        const hiddenElements = document.querySelectorAll('.focus-mode-hidden');
        hiddenElements.forEach(el => el.classList.remove('focus-mode-hidden'));
      `);
    } catch (error) {
      debugPrint("FOCUS_MODE", `Error removing focus styles: ${error}`);
    }
  }

  private setupSocialMediaBlocking(webContents: WebContents) {
    const socialMediaDomains = [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'tiktok.com',
      'youtube.com',
      'reddit.com',
      'linkedin.com',
      'snapchat.com',
      'pinterest.com'
    ];

    socialMediaDomains.forEach(domain => this.blockedDomains.add(domain));

    // Block navigation to social media sites
    webContents.on('will-navigate', (event, url) => {
      const urlObj = new URL(url);
      if (this.blockedDomains.has(urlObj.hostname)) {
        event.preventDefault();
        this.showBlockedMessage(webContents, urlObj.hostname);
      }
    });
  }

  private async showBlockedMessage(webContents: WebContents, domain: string) {
    await webContents.executeJavaScript(`
      const overlay = document.createElement('div');
      overlay.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
        text-align: center;
      \`;
      
      overlay.innerHTML = \`
        <div>
          <h2>🎯 Focus Mode Active</h2>
          <p>Access to ${domain} is blocked during focus mode.</p>
          <p>Stay focused on your current task!</p>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="margin-top: 20px; padding: 10px 20px; background: #007acc; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Continue Focusing
          </button>
        </div>
      \`;
      
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        if (overlay.parentElement) {
          overlay.remove();
        }
      }, 5000);
    `);
  }

  private setupFocusTimer(webContents: WebContents, duration: number) {
    const endTime = Date.now() + (duration * 60 * 1000);

    const timer = setInterval(async () => {
      const remaining = endTime - Date.now();
      
      if (remaining <= 0) {
        clearInterval(timer);
        await this.disableFocusMode(webContents);
        await this.showTimerComplete(webContents);
        return;
      }

      // Update timer display
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      await webContents.executeJavaScript(`
        let timerDisplay = document.getElementById('focus-timer');
        if (!timerDisplay) {
          timerDisplay = document.createElement('div');
          timerDisplay.id = 'focus-timer';
          timerDisplay.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-family: monospace;
            font-size: 14px;
            z-index: 9999;
          \`;
          document.body.appendChild(timerDisplay);
        }
        timerDisplay.textContent = '🎯 ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}';
      `);
    }, 1000);
  }

  private async showTimerComplete(webContents: WebContents) {
    await webContents.executeJavaScript(`
      const notification = document.createElement('div');
      notification.style.cssText = \`
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #4CAF50;
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      \`;
      
      notification.innerHTML = \`
        <h3>🎉 Focus Session Complete!</h3>
        <p>Great job staying focused!</p>
      \`;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    `);
  }

  public getFocusSession(webContentsId: number): FocusSession | null {
    return this.activeSessions.get(webContentsId) || null;
  }

  public isInFocusMode(webContentsId: number): boolean {
    const session = this.activeSessions.get(webContentsId);
    return session ? session.active : false;
  }

  private generateSessionId(): string {
    return `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getActiveSessions(): FocusSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.active);
  }
}

export const focusModeManager = new FocusModeManager();
