import { IPCListener } from "~/flow/types";

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

export interface FlowDownloadsAPI {
  /**
   * Get all downloads
   */
  getAll: () => Promise<DownloadInfo[]>;

  /**
   * Get a specific download by ID
   */
  get: (id: string) => Promise<DownloadInfo | undefined>;

  /**
   * Remove a download from the list
   */
  remove: (id: string) => Promise<boolean>;

  /**
   * Clear all completed downloads
   */
  clearCompleted: () => Promise<void>;

  /**
   * Open a downloaded file
   */
  open: (id: string) => Promise<void>;

  /**
   * Show the downloaded file in folder
   */
  showInFolder: (id: string) => Promise<void>;

  /**
   * Get download progress percentage
   */
  getProgress: (id: string) => Promise<number>;

  /**
   * Get download speed in bytes per second
   */
  getSpeed: (id: string) => Promise<number>;

  /**
   * Format file size in human readable format
   */
  formatFileSize: (bytes: number) => Promise<string>;

  /**
   * Format speed in human readable format
   */
  formatSpeed: (bytesPerSecond: number) => Promise<string>;

  /**
   * Listen for download changes
   */
  onChanged: IPCListener<[DownloadInfo[]]>;
}
