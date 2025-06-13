import { ipcMain, WebContents } from "electron";
import { readingModeManager, ReadingModeContent } from "@/modules/reading-mode";
import { browser } from "@/index";
import { debugPrint } from "@/modules/output";

// Extract content for reading mode
ipcMain.handle("reading-mode:extract-content", async (event): Promise<ReadingModeContent | null> => {
  const webContents = event.sender;
  return await readingModeManager.extractContent(webContents);
});

// Toggle reading mode
ipcMain.handle("reading-mode:toggle", async (event): Promise<boolean> => {
  const webContents = event.sender;
  return await readingModeManager.toggleReadingMode(webContents);
});

// Get reading mode content
ipcMain.handle("reading-mode:get-content", async (event): Promise<ReadingModeContent | null> => {
  const webContents = event.sender;
  return readingModeManager.getReadingModeContent(webContents.id);
});

// Check if reading mode is available for current page
ipcMain.handle("reading-mode:is-available", async (event): Promise<boolean> => {
  const webContents = event.sender;
  
  try {
    // Check if the current page has readable content
    const hasContent = await webContents.executeJavaScript(`
      (function() {
        // Check for common content indicators
        const contentSelectors = [
          'article',
          '[role="main"]',
          'main',
          '.content',
          '#content',
          '.post',
          '.entry',
          '.article'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.trim().length > 500) {
            return true;
          }
        }
        
        // Check for paragraphs
        const paragraphs = document.querySelectorAll('p');
        let totalText = 0;
        for (const p of paragraphs) {
          totalText += p.textContent?.length || 0;
        }
        
        return totalText > 1000;
      })();
    `);
    
    return hasContent;
  } catch (error) {
    debugPrint("READING_MODE", `Error checking availability: ${error}`);
    return false;
  }
});

debugPrint("IPC", "Reading mode IPC handlers registered");
