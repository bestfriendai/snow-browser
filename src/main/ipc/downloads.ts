import { ipcMain } from "electron";
import { downloadManager, DownloadInfo } from "@/modules/download-manager";
import { debugPrint } from "@/modules/output";

// Get all downloads
ipcMain.handle("downloads:get-all", async (): Promise<DownloadInfo[]> => {
  return downloadManager.getDownloads();
});

// Get specific download
ipcMain.handle("downloads:get", async (event, id: string): Promise<DownloadInfo | undefined> => {
  return downloadManager.getDownload(id);
});

// Remove download from list
ipcMain.handle("downloads:remove", async (event, id: string): Promise<boolean> => {
  return downloadManager.removeDownload(id);
});

// Clear completed downloads
ipcMain.handle("downloads:clear-completed", async (): Promise<void> => {
  downloadManager.clearCompletedDownloads();
});

// Open downloaded file
ipcMain.handle("downloads:open", async (event, id: string): Promise<void> => {
  downloadManager.openDownload(id);
});

// Show file in folder
ipcMain.handle("downloads:show-in-folder", async (event, id: string): Promise<void> => {
  downloadManager.showInFolder(id);
});

// Get download progress
ipcMain.handle("downloads:get-progress", async (event, id: string): Promise<number> => {
  return downloadManager.getDownloadProgress(id);
});

// Get download speed
ipcMain.handle("downloads:get-speed", async (event, id: string): Promise<number> => {
  return downloadManager.getDownloadSpeed(id);
});

// Format file size
ipcMain.handle("downloads:format-file-size", async (event, bytes: number): Promise<string> => {
  return downloadManager.formatFileSize(bytes);
});

// Format speed
ipcMain.handle("downloads:format-speed", async (event, bytesPerSecond: number): Promise<string> => {
  return downloadManager.formatSpeed(bytesPerSecond);
});

// Listen for download changes
ipcMain.handle("downloads:listen", (event) => {
  const cleanup = downloadManager.onDownloadsChanged((downloads) => {
    event.sender.send("downloads:changed", downloads);
  });

  // Clean up when the renderer process is destroyed
  event.sender.on("destroyed", cleanup);
  
  return true;
});

debugPrint("IPC", "Downloads IPC handlers registered");
