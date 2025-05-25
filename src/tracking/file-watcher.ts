/**
 * File watching implementation using chokidar
 */

import chokidar from "chokidar";
import type { IFileWatcher, ServerConfig } from "../types/index.js";

export class FileWatcher implements IFileWatcher {
  private watcher?: chokidar.FSWatcher;
  private changeCallback?: (path: string) => void;

  start(workspaceRoot: string, config?: Partial<ServerConfig>): void {
    const watchPatterns = config?.watchPatterns || [
      "**/*.{ts,tsx,js,jsx}",
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "tsconfig.*"
    ];

    const ignoredPatterns = config?.ignoredPatterns || ["**/node_modules/**"];

    this.watcher = chokidar.watch(watchPatterns, {
      cwd: workspaceRoot,
      ignored: ignoredPatterns,
      ignoreInitial: true,
    });

    this.watcher.on("all", (_event, filePath) => {
      if (this.changeCallback) {
        this.changeCallback(filePath);
      }
    });
  }

  on(event: 'change', callback: (path: string) => void): void {
    if (event === 'change') {
      this.changeCallback = callback;
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
}
