import { app, BrowserWindow, dialog, DownloadItem, shell } from "electron";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { getSettingValueById } from "@/saving/settings";
import { debugPrint } from "@/modules/output";

export interface DownloadInfo {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  startTime: number;
  endTime?: number;
  savePath: string;
  mimeType?: string;
  canResume: boolean;
}

class DownloadManager {
  private downloads = new Map<string, DownloadInfo>();
  private downloadListeners = new Set<(downloads: DownloadInfo[]) => void>();

  constructor() {
    this.setupDownloadHandlers();
  }

  private setupDownloadHandlers() {
    // Handle downloads for all sessions
    app.on("session-created", (session) => {
      session.on("will-download", (event, item, webContents) => {
        this.handleDownload(item, webContents);
      });
    });
  }

  private async handleDownload(item: DownloadItem, webContents: Electron.WebContents) {
    const downloadId = this.generateDownloadId();
    const filename = item.getFilename();
    const url = item.getURL();
    const totalBytes = item.getTotalBytes();
    const mimeType = item.getMimeType();

    debugPrint("DOWNLOAD", `Starting download: ${filename} from ${url}`);

    // Determine save path
    let savePath: string;
    const askDownloadLocation = getSettingValueById("askDownloadLocation") as boolean;
    const defaultDownloadLocation = getSettingValueById("downloadLocation") as string;

    if (askDownloadLocation) {
      const window = BrowserWindow.fromWebContents(webContents);
      const result = await dialog.showSaveDialog(window || undefined, {
        defaultPath: filename,
        filters: this.getFileFilters(filename, mimeType)
      });

      if (result.canceled) {
        item.cancel();
        return;
      }
      savePath = result.filePath!;
    } else {
      const downloadDir = defaultDownloadLocation || app.getPath("downloads");
      if (!existsSync(downloadDir)) {
        mkdirSync(downloadDir, { recursive: true });
      }
      savePath = join(downloadDir, filename);
    }

    // Set the save path
    item.setSavePath(savePath);

    // Create download info
    const downloadInfo: DownloadInfo = {
      id: downloadId,
      filename,
      url,
      totalBytes,
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
      savePath,
      mimeType,
      canResume: item.canResume()
    };

    this.downloads.set(downloadId, downloadInfo);
    this.notifyListeners();

    // Handle download progress
    item.on("updated", (event, state) => {
      const updatedInfo = this.downloads.get(downloadId);
      if (!updatedInfo) return;

      updatedInfo.receivedBytes = item.getReceivedBytes();
      updatedInfo.state = state as DownloadInfo["state"];
      updatedInfo.canResume = item.canResume();

      this.downloads.set(downloadId, updatedInfo);
      this.notifyListeners();
    });

    // Handle download completion
    item.once("done", (event, state) => {
      const completedInfo = this.downloads.get(downloadId);
      if (!completedInfo) return;

      completedInfo.state = state as DownloadInfo["state"];
      completedInfo.endTime = Date.now();
      completedInfo.receivedBytes = item.getReceivedBytes();

      this.downloads.set(downloadId, completedInfo);
      this.notifyListeners();

      if (state === "completed") {
        debugPrint("DOWNLOAD", `Download completed: ${filename}`);
        this.showDownloadNotification(completedInfo);
      } else {
        debugPrint("DOWNLOAD", `Download ${state}: ${filename}`);
      }
    });
  }

  private getFileFilters(filename: string, mimeType?: string): Electron.FileFilter[] {
    const extension = filename.split('.').pop()?.toLowerCase();
    const filters: Electron.FileFilter[] = [];

    // Add specific filter based on extension or mime type
    if (extension) {
      const filterName = this.getFilterNameForExtension(extension);
      if (filterName) {
        filters.push({ name: filterName, extensions: [extension] });
      }
    }

    // Add all files filter
    filters.push({ name: "All Files", extensions: ["*"] });

    return filters;
  }

  private getFilterNameForExtension(extension: string): string | null {
    const extensionMap: Record<string, string> = {
      pdf: "PDF Documents",
      doc: "Word Documents",
      docx: "Word Documents",
      xls: "Excel Spreadsheets",
      xlsx: "Excel Spreadsheets",
      ppt: "PowerPoint Presentations",
      pptx: "PowerPoint Presentations",
      txt: "Text Files",
      jpg: "JPEG Images",
      jpeg: "JPEG Images",
      png: "PNG Images",
      gif: "GIF Images",
      svg: "SVG Images",
      mp4: "MP4 Videos",
      avi: "AVI Videos",
      mov: "MOV Videos",
      mp3: "MP3 Audio",
      wav: "WAV Audio",
      zip: "ZIP Archives",
      rar: "RAR Archives",
      tar: "TAR Archives",
      gz: "GZIP Archives"
    };

    return extensionMap[extension] || null;
  }

  private generateDownloadId(): string {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private showDownloadNotification(download: DownloadInfo) {
    // This could be enhanced with native notifications
    debugPrint("DOWNLOAD", `Download notification: ${download.filename} completed`);
  }

  private notifyListeners() {
    const downloadsList = Array.from(this.downloads.values());
    this.downloadListeners.forEach(listener => listener(downloadsList));
  }

  // Public API
  public getDownloads(): DownloadInfo[] {
    return Array.from(this.downloads.values());
  }

  public getDownload(id: string): DownloadInfo | undefined {
    return this.downloads.get(id);
  }

  public removeDownload(id: string): boolean {
    return this.downloads.delete(id);
  }

  public clearCompletedDownloads(): void {
    for (const [id, download] of this.downloads.entries()) {
      if (download.state === "completed") {
        this.downloads.delete(id);
      }
    }
    this.notifyListeners();
  }

  public openDownload(id: string): void {
    const download = this.downloads.get(id);
    if (download && download.state === "completed") {
      shell.openPath(download.savePath);
    }
  }

  public showInFolder(id: string): void {
    const download = this.downloads.get(id);
    if (download && download.state === "completed") {
      shell.showItemInFolder(download.savePath);
    }
  }

  public onDownloadsChanged(listener: (downloads: DownloadInfo[]) => void): () => void {
    this.downloadListeners.add(listener);
    return () => this.downloadListeners.delete(listener);
  }

  public getDownloadProgress(id: string): number {
    const download = this.downloads.get(id);
    if (!download || download.totalBytes === 0) return 0;
    return (download.receivedBytes / download.totalBytes) * 100;
  }

  public getDownloadSpeed(id: string): number {
    const download = this.downloads.get(id);
    if (!download || download.state !== "progressing") return 0;
    
    const elapsed = Date.now() - download.startTime;
    if (elapsed === 0) return 0;
    
    return (download.receivedBytes / elapsed) * 1000; // bytes per second
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  public formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + "/s";
  }
}

export const downloadManager = new DownloadManager();
