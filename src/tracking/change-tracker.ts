/**
 * Change detection and versioning state management
 */

import type { IChangeTracker, RefreshResult } from "../types/index.js";

export class ChangeTracker implements IChangeTracker {
  private version = 1;
  private lastScan = new Date();
  private changedFiles = new Set<string>();

  getChangedFiles(): string[] {
    return Array.from(this.changedFiles);
  }

  markDirty(file: string): void {
    this.changedFiles.add(file);
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
}
