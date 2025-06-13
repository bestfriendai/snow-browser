import { app } from "electron";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { debugPrint } from "@/modules/output";

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitTime: number;
  visitDuration?: number; // in milliseconds
  referrer?: string;
  searchQuery?: string;
  scrollPosition?: number;
  sessionId: string;
  tabId?: number;
  isIncognito: boolean;
  domain: string;
  protocol: string;
}

export interface HistorySession {
  id: string;
  startTime: number;
  endTime?: number;
  entryIds: string[];
  deviceInfo?: {
    platform: string;
    userAgent: string;
  };
}

export interface HistoryStats {
  totalVisits: number;
  uniqueDomains: number;
  averageSessionDuration: number;
  topDomains: { domain: string; count: number }[];
  visitsByHour: number[];
  visitsByDay: number[];
}

export interface SearchOptions {
  query?: string;
  domain?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'visitTime' | 'title' | 'domain' | 'visitDuration';
  sortOrder?: 'asc' | 'desc';
  includeIncognito?: boolean;
}

class EnhancedHistoryManager {
  private entries = new Map<string, HistoryEntry>();
  private sessions = new Map<string, HistorySession>();
  private historyPath: string;
  private currentSessionId: string;
  private maxEntries = 100000; // Maximum number of history entries to keep

  constructor() {
    this.historyPath = join(app.getPath("userData"), "history", "history.json");
    this.currentSessionId = this.generateSessionId();
    this.setupHistory();
  }

  private async setupHistory() {
    // Create history directory if it doesn't exist
    const historyDir = join(app.getPath("userData"), "history");
    if (!existsSync(historyDir)) {
      await mkdir(historyDir, { recursive: true });
    }

    // Load existing history
    await this.loadHistory();

    // Start new session
    await this.startNewSession();

    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupOldEntries();
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    debugPrint("HISTORY", "Enhanced history manager initialized");
  }

  private async loadHistory() {
    try {
      if (existsSync(this.historyPath)) {
        const data = await readFile(this.historyPath, 'utf-8');
        const historyData = JSON.parse(data);
        
        // Load entries
        if (historyData.entries) {
          for (const entry of historyData.entries) {
            this.entries.set(entry.id, entry);
          }
        }

        // Load sessions
        if (historyData.sessions) {
          for (const session of historyData.sessions) {
            this.sessions.set(session.id, session);
          }
        }

        debugPrint("HISTORY", `Loaded ${this.entries.size} history entries and ${this.sessions.size} sessions`);
      }
    } catch (error) {
      debugPrint("HISTORY", `Error loading history: ${error}`);
    }
  }

  private async saveHistory() {
    try {
      const historyData = {
        entries: Array.from(this.entries.values()),
        sessions: Array.from(this.sessions.values()),
        version: 1,
        lastSaved: Date.now()
      };

      await writeFile(this.historyPath, JSON.stringify(historyData, null, 2));
    } catch (error) {
      debugPrint("HISTORY", `Error saving history: ${error}`);
    }
  }

  private async startNewSession() {
    const session: HistorySession = {
      id: this.currentSessionId,
      startTime: Date.now(),
      entryIds: [],
      deviceInfo: {
        platform: process.platform,
        userAgent: 'Snow Browser'
      }
    };

    this.sessions.set(this.currentSessionId, session);
    await this.saveHistory();
  }

  public async addEntry(entry: Omit<HistoryEntry, 'id' | 'sessionId' | 'domain' | 'protocol'>): Promise<string> {
    const id = this.generateId();
    const url = new URL(entry.url);

    const historyEntry: HistoryEntry = {
      ...entry,
      id,
      sessionId: this.currentSessionId,
      domain: url.hostname,
      protocol: url.protocol
    };

    this.entries.set(id, historyEntry);

    // Add to current session
    const currentSession = this.sessions.get(this.currentSessionId);
    if (currentSession) {
      currentSession.entryIds.push(id);
    }

    // Save periodically (not on every entry for performance)
    if (this.entries.size % 10 === 0) {
      await this.saveHistory();
    }

    debugPrint("HISTORY", `Added history entry: ${entry.title}`);
    return id;
  }

  public async updateEntry(id: string, updates: Partial<HistoryEntry>): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    this.entries.set(id, { ...entry, ...updates });
    return true;
  }

  public async deleteEntry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    this.entries.delete(id);

    // Remove from session
    const session = this.sessions.get(entry.sessionId);
    if (session) {
      session.entryIds = session.entryIds.filter(entryId => entryId !== id);
    }

    await this.saveHistory();
    return true;
  }

  public async clearHistory(options: {
    timeRange?: { start: number; end: number };
    domains?: string[];
    everything?: boolean;
  } = {}): Promise<number> {
    const { timeRange, domains, everything } = options;
    let deletedCount = 0;

    if (everything) {
      deletedCount = this.entries.size;
      this.entries.clear();
      this.sessions.clear();
    } else {
      const entriesToDelete: string[] = [];

      for (const [id, entry] of this.entries.entries()) {
        let shouldDelete = false;

        if (timeRange) {
          if (entry.visitTime >= timeRange.start && entry.visitTime <= timeRange.end) {
            shouldDelete = true;
          }
        }

        if (domains && domains.includes(entry.domain)) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          entriesToDelete.push(id);
        }
      }

      for (const id of entriesToDelete) {
        await this.deleteEntry(id);
        deletedCount++;
      }
    }

    await this.saveHistory();
    debugPrint("HISTORY", `Cleared ${deletedCount} history entries`);
    return deletedCount;
  }

  public searchHistory(options: SearchOptions): HistoryEntry[] {
    const {
      query,
      domain,
      dateRange,
      limit = 100,
      offset = 0,
      sortBy = 'visitTime',
      sortOrder = 'desc',
      includeIncognito = false
    } = options;

    let results = Array.from(this.entries.values());

    // Filter by incognito
    if (!includeIncognito) {
      results = results.filter(entry => !entry.isIncognito);
    }

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(entry =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.url.toLowerCase().includes(lowerQuery) ||
        entry.searchQuery?.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by domain
    if (domain) {
      results = results.filter(entry => entry.domain === domain);
    }

    // Filter by date range
    if (dateRange) {
      results = results.filter(entry =>
        entry.visitTime >= dateRange.start && entry.visitTime <= dateRange.end
      );
    }

    // Sort results
    results.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  public getTopDomains(limit: number = 10): { domain: string; count: number; lastVisit: number }[] {
    const domainCounts = new Map<string, { count: number; lastVisit: number }>();

    for (const entry of this.entries.values()) {
      if (entry.isIncognito) continue;

      const existing = domainCounts.get(entry.domain) || { count: 0, lastVisit: 0 };
      domainCounts.set(entry.domain, {
        count: existing.count + 1,
        lastVisit: Math.max(existing.lastVisit, entry.visitTime)
      });
    }

    return Array.from(domainCounts.entries())
      .map(([domain, data]) => ({ domain, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  public getRecentHistory(limit: number = 20): HistoryEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => !entry.isIncognito)
      .sort((a, b) => b.visitTime - a.visitTime)
      .slice(0, limit);
  }

  public getHistoryStats(): HistoryStats {
    const entries = Array.from(this.entries.values()).filter(e => !e.isIncognito);
    const domains = new Set(entries.map(e => e.domain));
    
    // Calculate average session duration
    const sessions = Array.from(this.sessions.values()).filter(s => s.endTime);
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0) / sessions.length
      : 0;

    // Top domains
    const topDomains = this.getTopDomains(10);

    // Visits by hour (0-23)
    const visitsByHour = new Array(24).fill(0);
    entries.forEach(entry => {
      const hour = new Date(entry.visitTime).getHours();
      visitsByHour[hour]++;
    });

    // Visits by day of week (0-6, Sunday-Saturday)
    const visitsByDay = new Array(7).fill(0);
    entries.forEach(entry => {
      const day = new Date(entry.visitTime).getDay();
      visitsByDay[day]++;
    });

    return {
      totalVisits: entries.length,
      uniqueDomains: domains.size,
      averageSessionDuration: avgSessionDuration,
      topDomains,
      visitsByHour,
      visitsByDay
    };
  }

  public getSession(sessionId: string): HistorySession | undefined {
    return this.sessions.get(sessionId);
  }

  public getCurrentSession(): HistorySession | undefined {
    return this.sessions.get(this.currentSessionId);
  }

  public async endCurrentSession(): Promise<void> {
    const currentSession = this.sessions.get(this.currentSessionId);
    if (currentSession) {
      currentSession.endTime = Date.now();
      await this.saveHistory();
    }

    // Start new session
    this.currentSessionId = this.generateSessionId();
    await this.startNewSession();
  }

  private cleanupOldEntries(): void {
    if (this.entries.size <= this.maxEntries) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.entries.values())
      .sort((a, b) => a.visitTime - b.visitTime);

    const entriesToRemove = entries.slice(0, this.entries.size - this.maxEntries);
    
    for (const entry of entriesToRemove) {
      this.entries.delete(entry.id);
    }

    debugPrint("HISTORY", `Cleaned up ${entriesToRemove.length} old history entries`);
  }

  public async exportHistory(): Promise<string> {
    const data = {
      entries: Array.from(this.entries.values()),
      sessions: Array.from(this.sessions.values()),
      exportedAt: Date.now(),
      version: 1
    };

    return JSON.stringify(data, null, 2);
  }

  public async importHistory(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);

      if (importData.entries) {
        for (const entry of importData.entries) {
          // Generate new ID to avoid conflicts
          const newId = this.generateId();
          this.entries.set(newId, { ...entry, id: newId });
        }
      }

      if (importData.sessions) {
        for (const session of importData.sessions) {
          const newId = this.generateSessionId();
          this.sessions.set(newId, { ...session, id: newId });
        }
      }

      await this.saveHistory();
      debugPrint("HISTORY", "History imported successfully");
      return true;
    } catch (error) {
      debugPrint("HISTORY", `Error importing history: ${error}`);
      return false;
    }
  }

  private generateId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getAllEntries(): HistoryEntry[] {
    return Array.from(this.entries.values());
  }

  public getAllSessions(): HistorySession[] {
    return Array.from(this.sessions.values());
  }

  public getEntry(id: string): HistoryEntry | undefined {
    return this.entries.get(id);
  }
}

export const enhancedHistoryManager = new EnhancedHistoryManager();
