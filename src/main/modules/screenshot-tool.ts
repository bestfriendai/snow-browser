import { app, BrowserWindow, dialog, nativeImage, WebContents } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getSettingValueById } from "@/saving/settings";
import { debugPrint } from "@/modules/output";

export interface ScreenshotOptions {
  quality: "low" | "medium" | "high";
  format: "png" | "jpeg";
  fullPage: boolean;
  includeUI: boolean;
}

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

class ScreenshotTool {
  constructor() {
    this.setupScreenshotTool();
  }

  private setupScreenshotTool() {
    debugPrint("SCREENSHOT", "Screenshot tool initialized");
  }

  public async captureTab(webContents: WebContents, options: Partial<ScreenshotOptions> = {}): Promise<ScreenshotResult> {
    try {
      const defaultOptions: ScreenshotOptions = {
        quality: (getSettingValueById("screenshotQuality") as ScreenshotOptions["quality"]) || "high",
        format: "png",
        fullPage: false,
        includeUI: false
      };

      const finalOptions = { ...defaultOptions, ...options };

      debugPrint("SCREENSHOT", `Capturing screenshot with options:`, finalOptions);

      let image: Electron.NativeImage;

      if (finalOptions.fullPage) {
        // Capture full page
        const originalSize = await webContents.executeJavaScript(`
          ({
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight
          })
        `);

        // Temporarily resize to capture full page
        const window = BrowserWindow.fromWebContents(webContents);
        if (window) {
          const currentBounds = window.getBounds();
          window.setBounds({
            ...currentBounds,
            width: originalSize.width,
            height: originalSize.height
          });

          image = await webContents.capturePage();

          // Restore original size
          window.setBounds(currentBounds);
        } else {
          image = await webContents.capturePage();
        }
      } else {
        // Capture visible area only
        image = await webContents.capturePage();
      }

      // Process image based on quality settings
      const processedImage = this.processImage(image, finalOptions);

      // Save the screenshot
      const filePath = await this.saveScreenshot(processedImage, finalOptions);

      debugPrint("SCREENSHOT", `Screenshot saved to: ${filePath}`);

      return {
        success: true,
        filePath
      };

    } catch (error) {
      debugPrint("SCREENSHOT", `Error capturing screenshot: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  public async captureWindow(window: BrowserWindow, options: Partial<ScreenshotOptions> = {}): Promise<ScreenshotResult> {
    try {
      const defaultOptions: ScreenshotOptions = {
        quality: (getSettingValueById("screenshotQuality") as ScreenshotOptions["quality"]) || "high",
        format: "png",
        fullPage: false,
        includeUI: true
      };

      const finalOptions = { ...defaultOptions, ...options };

      debugPrint("SCREENSHOT", `Capturing window screenshot`);

      const image = await window.capturePage();
      const processedImage = this.processImage(image, finalOptions);
      const filePath = await this.saveScreenshot(processedImage, finalOptions);

      return {
        success: true,
        filePath
      };

    } catch (error) {
      debugPrint("SCREENSHOT", `Error capturing window: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  public async captureRegion(
    webContents: WebContents, 
    region: { x: number; y: number; width: number; height: number },
    options: Partial<ScreenshotOptions> = {}
  ): Promise<ScreenshotResult> {
    try {
      const defaultOptions: ScreenshotOptions = {
        quality: (getSettingValueById("screenshotQuality") as ScreenshotOptions["quality"]) || "high",
        format: "png",
        fullPage: false,
        includeUI: false
      };

      const finalOptions = { ...defaultOptions, ...options };

      debugPrint("SCREENSHOT", `Capturing region screenshot:`, region);

      const fullImage = await webContents.capturePage();
      const croppedImage = fullImage.crop(region);
      const processedImage = this.processImage(croppedImage, finalOptions);
      const filePath = await this.saveScreenshot(processedImage, finalOptions);

      return {
        success: true,
        filePath
      };

    } catch (error) {
      debugPrint("SCREENSHOT", `Error capturing region: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private processImage(image: Electron.NativeImage, options: ScreenshotOptions): Electron.NativeImage {
    if (options.format === "jpeg") {
      // Convert to JPEG with quality settings
      const quality = this.getJpegQuality(options.quality);
      const jpegBuffer = image.toJPEG(quality);
      return nativeImage.createFromBuffer(jpegBuffer);
    }

    // For PNG, we can resize if needed for quality
    if (options.quality === "low") {
      const size = image.getSize();
      const scaledImage = image.resize({
        width: Math.floor(size.width * 0.7),
        height: Math.floor(size.height * 0.7)
      });
      return scaledImage;
    }

    return image;
  }

  private getJpegQuality(quality: ScreenshotOptions["quality"]): number {
    switch (quality) {
      case "low":
        return 60;
      case "medium":
        return 80;
      case "high":
        return 95;
      default:
        return 80;
    }
  }

  private async saveScreenshot(image: Electron.NativeImage, options: ScreenshotOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = options.format;
    const filename = `screenshot-${timestamp}.${extension}`;

    // Get download directory
    const downloadDir = (getSettingValueById("downloadLocation") as string) || app.getPath("downloads");
    const filePath = join(downloadDir, filename);

    // Get image buffer
    const buffer = options.format === "jpeg" 
      ? image.toJPEG(this.getJpegQuality(options.quality))
      : image.toPNG();

    // Save file
    await writeFile(filePath, buffer);

    return filePath;
  }

  public async saveScreenshotAs(
    image: Electron.NativeImage, 
    window?: BrowserWindow,
    options: Partial<ScreenshotOptions> = {}
  ): Promise<ScreenshotResult> {
    try {
      const defaultOptions: ScreenshotOptions = {
        quality: (getSettingValueById("screenshotQuality") as ScreenshotOptions["quality"]) || "high",
        format: "png",
        fullPage: false,
        includeUI: false
      };

      const finalOptions = { ...defaultOptions, ...options };

      const result = await dialog.showSaveDialog(window || undefined, {
        defaultPath: `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.${finalOptions.format}`,
        filters: [
          { name: "PNG Images", extensions: ["png"] },
          { name: "JPEG Images", extensions: ["jpg", "jpeg"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: "Save cancelled"
        };
      }

      const processedImage = this.processImage(image, finalOptions);
      const buffer = finalOptions.format === "jpeg" 
        ? processedImage.toJPEG(this.getJpegQuality(finalOptions.quality))
        : processedImage.toPNG();

      await writeFile(result.filePath, buffer);

      return {
        success: true,
        filePath: result.filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

export const screenshotTool = new ScreenshotTool();
