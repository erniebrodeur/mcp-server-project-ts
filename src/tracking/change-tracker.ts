/**
 * Change detection and versioning state management
 */

import type { IChangeTracker, RefreshResult } from "../types/index.js";

export class ChangeTracker implements IChangeTracker {
  private version = 1;
  private lastScan = new Date();
  private changedFiles = new Set<string>();
  private changeHistory: Array<{ file: string; timestamp: Date; version: number }> = [];

  getChangedFiles(): string[] {
    return Array.from(this.changedFiles);
  }

  markDirty(file: string): void {
    this.changedFiles.add(file);
    this.changeHistory.push({
      file,
      timestamp: new Date(),
      version: this.version,
    });

    // Keep history manageable - only last 1000 entries
    if (this.changeHistory.length > 1000) {
      this.changeHistory = this.changeHistory.slice(-1000);
    }
  }

  refresh(): RefreshResult {
    const result: RefreshResult = {
      changedFiles: Array.from(this.changedFiles),
      cleared: this.changedFiles.size,
      previousVersion: this.version,
    };

    // Clear the changed files list - agent will read them itself
    this.changedFiles.clear();
    this.version++;
    this.lastScan = new Date();

    return result;
  }

  getStatus(): {
    dirty: boolean;
    version: number;
    lastScan: Date;
    changedFiles: string[];
  } {
    return {
      dirty: this.changedFiles.size > 0,
      version: this.version,
      lastScan: this.lastScan,
      changedFiles: Array.from(this.changedFiles),
    };
  }

  // Enhanced change tracking methods
  getChangesSince(timestamp: Date): string[] {
    return this.changeHistory
      .filter(entry => entry.timestamp > timestamp)
      .map(entry => entry.file)
      .filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates
  }

  getChangesSinceVersion(version: number): string[] {
    return this.changeHistory
      .filter(entry => entry.version > version)
      .map(entry => entry.file)
      .filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates
  }

  getChangeHistory(): Array<{ file: string; timestamp: Date; version: number }> {
    return [...this.changeHistory]; // Return a copy
  }
}
