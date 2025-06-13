import { app, safeStorage } from "electron";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { debugPrint } from "@/modules/output";
import { createHash, randomBytes } from "crypto";

export interface PasswordEntry {
  id: string;
  domain: string;
  url: string;
  username: string;
  password: string;
  title: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
  autoFill: boolean;
}

export interface PasswordVault {
  entries: PasswordEntry[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

class PasswordManager {
  private vault: PasswordVault | null = null;
  private vaultPath: string;
  private isUnlocked = false;
  private masterPasswordHash: string | null = null;

  constructor() {
    this.vaultPath = join(app.getPath("userData"), "passwords", "vault.json");
    this.setupPasswordManager();
  }

  private async setupPasswordManager() {
    // Create passwords directory if it doesn't exist
    const passwordsDir = join(app.getPath("userData"), "passwords");
    if (!existsSync(passwordsDir)) {
      await mkdir(passwordsDir, { recursive: true });
    }

    debugPrint("PASSWORD_MANAGER", "Password manager initialized");
  }

  public async createVault(masterPassword: string): Promise<boolean> {
    try {
      if (this.vault) {
        throw new Error("Vault already exists");
      }

      // Create master password hash
      this.masterPasswordHash = this.hashPassword(masterPassword);

      // Create new vault
      this.vault = {
        entries: [],
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.saveVault();
      this.isUnlocked = true;

      debugPrint("PASSWORD_MANAGER", "Password vault created");
      return true;
    } catch (error) {
      debugPrint("PASSWORD_MANAGER", `Error creating vault: ${error}`);
      return false;
    }
  }

  public async unlockVault(masterPassword: string): Promise<boolean> {
    try {
      if (!existsSync(this.vaultPath)) {
        throw new Error("Vault does not exist");
      }

      // Verify master password
      const passwordHash = this.hashPassword(masterPassword);
      
      // Load and decrypt vault
      const encryptedData = await readFile(this.vaultPath, 'utf-8');
      const vaultData = JSON.parse(encryptedData);
      
      if (vaultData.masterPasswordHash !== passwordHash) {
        throw new Error("Invalid master password");
      }

      // Decrypt vault entries if using safeStorage
      if (safeStorage.isEncryptionAvailable()) {
        const decryptedEntries = safeStorage.decryptString(Buffer.from(vaultData.encryptedEntries, 'base64'));
        this.vault = {
          ...vaultData,
          entries: JSON.parse(decryptedEntries)
        };
      } else {
        this.vault = vaultData;
      }

      this.masterPasswordHash = passwordHash;
      this.isUnlocked = true;

      debugPrint("PASSWORD_MANAGER", "Password vault unlocked");
      return true;
    } catch (error) {
      debugPrint("PASSWORD_MANAGER", `Error unlocking vault: ${error}`);
      return false;
    }
  }

  public lockVault(): void {
    this.vault = null;
    this.masterPasswordHash = null;
    this.isUnlocked = false;
    debugPrint("PASSWORD_MANAGER", "Password vault locked");
  }

  public isVaultUnlocked(): boolean {
    return this.isUnlocked && this.vault !== null;
  }

  public async addPassword(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.isVaultUnlocked()) {
      throw new Error("Vault is locked");
    }

    const id = this.generateId();
    const now = Date.now();

    const passwordEntry: PasswordEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.vault!.entries.push(passwordEntry);
    this.vault!.updatedAt = now;

    await this.saveVault();

    debugPrint("PASSWORD_MANAGER", `Added password entry for ${entry.domain}`);
    return id;
  }

  public async updatePassword(id: string, updates: Partial<PasswordEntry>): Promise<boolean> {
    if (!this.isVaultUnlocked()) {
      throw new Error("Vault is locked");
    }

    const entryIndex = this.vault!.entries.findIndex(e => e.id === id);
    if (entryIndex === -1) {
      return false;
    }

    this.vault!.entries[entryIndex] = {
      ...this.vault!.entries[entryIndex],
      ...updates,
      updatedAt: Date.now()
    };

    this.vault!.updatedAt = Date.now();
    await this.saveVault();

    debugPrint("PASSWORD_MANAGER", `Updated password entry ${id}`);
    return true;
  }

  public async deletePassword(id: string): Promise<boolean> {
    if (!this.isVaultUnlocked()) {
      throw new Error("Vault is locked");
    }

    const initialLength = this.vault!.entries.length;
    this.vault!.entries = this.vault!.entries.filter(e => e.id !== id);

    if (this.vault!.entries.length < initialLength) {
      this.vault!.updatedAt = Date.now();
      await this.saveVault();
      debugPrint("PASSWORD_MANAGER", `Deleted password entry ${id}`);
      return true;
    }

    return false;
  }

  public getPasswordsForDomain(domain: string): PasswordEntry[] {
    if (!this.isVaultUnlocked()) {
      return [];
    }

    return this.vault!.entries.filter(entry => 
      entry.domain === domain || entry.url.includes(domain)
    );
  }

  public getAllPasswords(): PasswordEntry[] {
    if (!this.isVaultUnlocked()) {
      return [];
    }

    return [...this.vault!.entries];
  }

  public searchPasswords(query: string): PasswordEntry[] {
    if (!this.isVaultUnlocked()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return this.vault!.entries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.domain.toLowerCase().includes(lowerQuery) ||
      entry.username.toLowerCase().includes(lowerQuery) ||
      entry.url.toLowerCase().includes(lowerQuery)
    );
  }

  public async markAsUsed(id: string): Promise<void> {
    if (!this.isVaultUnlocked()) {
      return;
    }

    const entry = this.vault!.entries.find(e => e.id === id);
    if (entry) {
      entry.lastUsed = Date.now();
      await this.saveVault();
    }
  }

  public generateSecurePassword(length: number = 16, options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  } = {}): string {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true
    } = options;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
      throw new Error('At least one character type must be included');
    }

    const randomValues = randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }

    return password;
  }

  public checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    strength: 'weak' | 'fair' | 'good' | 'strong';
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Common patterns check
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 2) strength = 'weak';
    else if (score <= 4) strength = 'fair';
    else if (score <= 6) strength = 'good';
    else strength = 'strong';

    return { score, feedback, strength };
  }

  private async saveVault(): Promise<void> {
    if (!this.vault) {
      throw new Error("No vault to save");
    }

    let dataToSave: any = {
      ...this.vault,
      masterPasswordHash: this.masterPasswordHash
    };

    // Encrypt entries if safeStorage is available
    if (safeStorage.isEncryptionAvailable()) {
      const entriesJson = JSON.stringify(this.vault.entries);
      const encryptedEntries = safeStorage.encryptString(entriesJson);
      dataToSave = {
        ...dataToSave,
        encryptedEntries: encryptedEntries.toString('base64'),
        entries: undefined
      };
    }

    await writeFile(this.vaultPath, JSON.stringify(dataToSave, null, 2));
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password + 'snow-browser-salt').digest('hex');
  }

  private generateId(): string {
    return `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getVaultStats(): {
    totalEntries: number;
    recentlyUsed: number;
    weakPasswords: number;
    duplicatePasswords: number;
  } {
    if (!this.isVaultUnlocked()) {
      return { totalEntries: 0, recentlyUsed: 0, weakPasswords: 0, duplicatePasswords: 0 };
    }

    const entries = this.vault!.entries;
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentlyUsed = entries.filter(e => e.lastUsed && e.lastUsed > oneWeekAgo).length;
    const weakPasswords = entries.filter(e => this.checkPasswordStrength(e.password).strength === 'weak').length;
    
    // Check for duplicate passwords
    const passwordCounts = new Map<string, number>();
    entries.forEach(e => {
      const count = passwordCounts.get(e.password) || 0;
      passwordCounts.set(e.password, count + 1);
    });
    const duplicatePasswords = Array.from(passwordCounts.values()).filter(count => count > 1).length;

    return {
      totalEntries: entries.length,
      recentlyUsed,
      weakPasswords,
      duplicatePasswords
    };
  }
}

export const passwordManager = new PasswordManager();
