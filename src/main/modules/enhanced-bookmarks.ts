import { app } from "electron";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { debugPrint } from "@/modules/output";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  description?: string;
  tags: string[];
  folderId?: string;
  createdAt: number;
  updatedAt: number;
  lastVisited?: number;
  visitCount: number;
  isArchived: boolean;
  notes?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  isExpanded: boolean;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  description?: string;
  bookmarkIds: string[];
  color?: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkData {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  collections: BookmarkCollection[];
  version: number;
  lastBackup?: number;
}

class EnhancedBookmarksManager {
  private data: BookmarkData;
  private dataPath: string;
  private backupDir: string;

  constructor() {
    this.dataPath = join(app.getPath("userData"), "bookmarks", "bookmarks.json");
    this.backupDir = join(app.getPath("userData"), "bookmarks", "backups");
    this.data = {
      bookmarks: [],
      folders: [],
      collections: [],
      version: 1
    };
    this.setupBookmarks();
  }

  private async setupBookmarks() {
    // Create bookmarks directory if it doesn't exist
    const bookmarksDir = join(app.getPath("userData"), "bookmarks");
    if (!existsSync(bookmarksDir)) {
      await mkdir(bookmarksDir, { recursive: true });
    }

    if (!existsSync(this.backupDir)) {
      await mkdir(this.backupDir, { recursive: true });
    }

    // Load existing bookmarks
    await this.loadBookmarks();

    // Create default folders if none exist
    if (this.data.folders.length === 0) {
      await this.createDefaultFolders();
    }

    debugPrint("BOOKMARKS", "Enhanced bookmarks manager initialized");
  }

  private async loadBookmarks() {
    try {
      if (existsSync(this.dataPath)) {
        const data = await readFile(this.dataPath, 'utf-8');
        this.data = JSON.parse(data);
        debugPrint("BOOKMARKS", `Loaded ${this.data.bookmarks.length} bookmarks`);
      }
    } catch (error) {
      debugPrint("BOOKMARKS", `Error loading bookmarks: ${error}`);
    }
  }

  private async saveBookmarks() {
    try {
      this.data.version = 1;
      await writeFile(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      debugPrint("BOOKMARKS", `Error saving bookmarks: ${error}`);
    }
  }

  private async createDefaultFolders() {
    const defaultFolders = [
      { name: "Bookmarks Bar", description: "Quick access bookmarks", color: "#3b82f6" },
      { name: "Work", description: "Work-related bookmarks", color: "#10b981" },
      { name: "Personal", description: "Personal bookmarks", color: "#f59e0b" },
      { name: "Reading List", description: "Articles to read later", color: "#8b5cf6" },
      { name: "Resources", description: "Useful resources and tools", color: "#ef4444" }
    ];

    for (const folder of defaultFolders) {
      await this.createFolder(folder);
    }
  }

  // Bookmark operations
  public async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'visitCount' | 'isArchived'>): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    const newBookmark: Bookmark = {
      ...bookmark,
      id,
      createdAt: now,
      updatedAt: now,
      visitCount: 0,
      isArchived: false
    };

    this.data.bookmarks.push(newBookmark);
    await this.saveBookmarks();

    debugPrint("BOOKMARKS", `Added bookmark: ${bookmark.title}`);
    return id;
  }

  public async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<boolean> {
    const bookmarkIndex = this.data.bookmarks.findIndex(b => b.id === id);
    if (bookmarkIndex === -1) {
      return false;
    }

    this.data.bookmarks[bookmarkIndex] = {
      ...this.data.bookmarks[bookmarkIndex],
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveBookmarks();
    return true;
  }

  public async deleteBookmark(id: string): Promise<boolean> {
    const initialLength = this.data.bookmarks.length;
    this.data.bookmarks = this.data.bookmarks.filter(b => b.id !== id);

    if (this.data.bookmarks.length < initialLength) {
      await this.saveBookmarks();
      return true;
    }
    return false;
  }

  public async visitBookmark(id: string): Promise<void> {
    const bookmark = this.data.bookmarks.find(b => b.id === id);
    if (bookmark) {
      bookmark.lastVisited = Date.now();
      bookmark.visitCount += 1;
      await this.saveBookmarks();
    }
  }

  // Folder operations
  public async createFolder(folder: Omit<BookmarkFolder, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'>): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    const newFolder: BookmarkFolder = {
      ...folder,
      id,
      createdAt: now,
      updatedAt: now,
      isExpanded: true
    };

    this.data.folders.push(newFolder);
    await this.saveBookmarks();

    debugPrint("BOOKMARKS", `Created folder: ${folder.name}`);
    return id;
  }

  public async updateFolder(id: string, updates: Partial<BookmarkFolder>): Promise<boolean> {
    const folderIndex = this.data.folders.findIndex(f => f.id === id);
    if (folderIndex === -1) {
      return false;
    }

    this.data.folders[folderIndex] = {
      ...this.data.folders[folderIndex],
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveBookmarks();
    return true;
  }

  public async deleteFolder(id: string, moveBookmarksToParent: boolean = true): Promise<boolean> {
    const folder = this.data.folders.find(f => f.id === id);
    if (!folder) {
      return false;
    }

    // Handle bookmarks in this folder
    const bookmarksInFolder = this.data.bookmarks.filter(b => b.folderId === id);
    if (moveBookmarksToParent) {
      bookmarksInFolder.forEach(bookmark => {
        bookmark.folderId = folder.parentId;
      });
    } else {
      // Delete bookmarks in folder
      this.data.bookmarks = this.data.bookmarks.filter(b => b.folderId !== id);
    }

    // Handle subfolders
    const subfolders = this.data.folders.filter(f => f.parentId === id);
    subfolders.forEach(subfolder => {
      subfolder.parentId = folder.parentId;
    });

    // Remove the folder
    this.data.folders = this.data.folders.filter(f => f.id !== id);

    await this.saveBookmarks();
    return true;
  }

  // Collection operations
  public async createCollection(collection: Omit<BookmarkCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    const newCollection: BookmarkCollection = {
      ...collection,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.data.collections.push(newCollection);
    await this.saveBookmarks();

    debugPrint("BOOKMARKS", `Created collection: ${collection.name}`);
    return id;
  }

  public async addBookmarkToCollection(bookmarkId: string, collectionId: string): Promise<boolean> {
    const collection = this.data.collections.find(c => c.id === collectionId);
    const bookmark = this.data.bookmarks.find(b => b.id === bookmarkId);

    if (!collection || !bookmark) {
      return false;
    }

    if (!collection.bookmarkIds.includes(bookmarkId)) {
      collection.bookmarkIds.push(bookmarkId);
      collection.updatedAt = Date.now();
      await this.saveBookmarks();
    }

    return true;
  }

  // Search and filtering
  public searchBookmarks(query: string, options: {
    includeArchived?: boolean;
    tags?: string[];
    folderId?: string;
  } = {}): Bookmark[] {
    const { includeArchived = false, tags, folderId } = options;
    const lowerQuery = query.toLowerCase();

    return this.data.bookmarks.filter(bookmark => {
      // Archive filter
      if (!includeArchived && bookmark.isArchived) {
        return false;
      }

      // Folder filter
      if (folderId && bookmark.folderId !== folderId) {
        return false;
      }

      // Tags filter
      if (tags && tags.length > 0) {
        const hasAllTags = tags.every(tag => bookmark.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // Text search
      if (query) {
        return (
          bookmark.title.toLowerCase().includes(lowerQuery) ||
          bookmark.url.toLowerCase().includes(lowerQuery) ||
          bookmark.description?.toLowerCase().includes(lowerQuery) ||
          bookmark.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
          bookmark.notes?.toLowerCase().includes(lowerQuery)
        );
      }

      return true;
    });
  }

  public getBookmarksByTag(tag: string): Bookmark[] {
    return this.data.bookmarks.filter(bookmark => 
      bookmark.tags.includes(tag) && !bookmark.isArchived
    );
  }

  public getBookmarksByFolder(folderId: string): Bookmark[] {
    return this.data.bookmarks.filter(bookmark => 
      bookmark.folderId === folderId && !bookmark.isArchived
    );
  }

  public getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.data.bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  public getPopularBookmarks(limit: number = 10): Bookmark[] {
    return this.data.bookmarks
      .filter(b => !b.isArchived)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);
  }

  public getRecentBookmarks(limit: number = 10): Bookmark[] {
    return this.data.bookmarks
      .filter(b => !b.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // Import/Export
  public async exportBookmarks(): Promise<string> {
    return JSON.stringify(this.data, null, 2);
  }

  public async importBookmarks(jsonData: string, mergeMode: 'replace' | 'merge' = 'merge'): Promise<boolean> {
    try {
      const importedData: BookmarkData = JSON.parse(jsonData);

      if (mergeMode === 'replace') {
        this.data = importedData;
      } else {
        // Merge mode - add imported items with new IDs
        for (const bookmark of importedData.bookmarks) {
          const newId = this.generateId();
          this.data.bookmarks.push({ ...bookmark, id: newId });
        }

        for (const folder of importedData.folders) {
          const newId = this.generateId();
          this.data.folders.push({ ...folder, id: newId });
        }

        for (const collection of importedData.collections) {
          const newId = this.generateId();
          this.data.collections.push({ ...collection, id: newId });
        }
      }

      await this.saveBookmarks();
      debugPrint("BOOKMARKS", "Bookmarks imported successfully");
      return true;
    } catch (error) {
      debugPrint("BOOKMARKS", `Error importing bookmarks: ${error}`);
      return false;
    }
  }

  // Backup and restore
  public async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(this.backupDir, `bookmarks-backup-${timestamp}.json`);
    
    await writeFile(backupPath, JSON.stringify(this.data, null, 2));
    this.data.lastBackup = Date.now();
    await this.saveBookmarks();

    debugPrint("BOOKMARKS", `Backup created: ${backupPath}`);
    return backupPath;
  }

  // Getters
  public getAllBookmarks(): Bookmark[] {
    return [...this.data.bookmarks];
  }

  public getAllFolders(): BookmarkFolder[] {
    return [...this.data.folders];
  }

  public getAllCollections(): BookmarkCollection[] {
    return [...this.data.collections];
  }

  public getBookmark(id: string): Bookmark | undefined {
    return this.data.bookmarks.find(b => b.id === id);
  }

  public getFolder(id: string): BookmarkFolder | undefined {
    return this.data.folders.find(f => f.id === id);
  }

  public getCollection(id: string): BookmarkCollection | undefined {
    return this.data.collections.find(c => c.id === id);
  }

  private generateId(): string {
    return `bmk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStatistics(): {
    totalBookmarks: number;
    archivedBookmarks: number;
    totalFolders: number;
    totalCollections: number;
    totalTags: number;
    mostVisitedBookmark?: Bookmark;
  } {
    const bookmarks = this.data.bookmarks;
    const mostVisited = bookmarks.reduce((prev, current) => 
      (prev.visitCount > current.visitCount) ? prev : current, bookmarks[0]
    );

    return {
      totalBookmarks: bookmarks.length,
      archivedBookmarks: bookmarks.filter(b => b.isArchived).length,
      totalFolders: this.data.folders.length,
      totalCollections: this.data.collections.length,
      totalTags: this.getAllTags().length,
      mostVisitedBookmark: mostVisited
    };
  }
}

export const enhancedBookmarksManager = new EnhancedBookmarksManager();
