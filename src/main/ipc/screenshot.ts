import { ipcMain, BrowserWindow } from "electron";
import { screenshotTool, ScreenshotOptions, ScreenshotResult } from "@/modules/screenshot-tool";
import { browser } from "@/index";
import { debugPrint } from "@/modules/output";

// Capture current tab
ipcMain.handle("screenshot:capture-tab", async (event, options?: Partial<ScreenshotOptions>): Promise<ScreenshotResult> => {
  const webContents = event.sender;
  return await screenshotTool.captureTab(webContents, options);
});

// Capture full page
ipcMain.handle("screenshot:capture-full-page", async (event, options?: Partial<ScreenshotOptions>): Promise<ScreenshotResult> => {
  const webContents = event.sender;
  return await screenshotTool.captureTab(webContents, { ...options, fullPage: true });
});

// Capture window (including UI)
ipcMain.handle("screenshot:capture-window", async (event, options?: Partial<ScreenshotOptions>): Promise<ScreenshotResult> => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  
  if (!window) {
    return {
      success: false,
      error: "No window found"
    };
  }
  
  return await screenshotTool.captureWindow(window, options);
});

// Capture region
ipcMain.handle("screenshot:capture-region", async (
  event, 
  region: { x: number; y: number; width: number; height: number },
  options?: Partial<ScreenshotOptions>
): Promise<ScreenshotResult> => {
  const webContents = event.sender;
  return await screenshotTool.captureRegion(webContents, region, options);
});

// Save screenshot with dialog
ipcMain.handle("screenshot:save-as", async (event, options?: Partial<ScreenshotOptions>): Promise<ScreenshotResult> => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  
  // First capture the current tab
  const image = await webContents.capturePage();
  
  return await screenshotTool.saveScreenshotAs(image, window, options);
});

debugPrint("IPC", "Screenshot IPC handlers registered");
