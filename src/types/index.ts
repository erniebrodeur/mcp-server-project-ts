/**
 * Shared types and interfaces for the MCP Project Change Tracker
 */

export interface ProjectStatus {
  dirty: boolean;
  version: number;
  lastScan: string;
  changedFiles: string[];
  dependencies: Record<string, string>;
  workspaceRoot: string;
}

export interface DependencyOperation {
  success: boolean;
  output: string;
  error?: string;
}

export interface RefreshResult {
  changedFiles: string[];
  cleared: number;
  previousVersion: number;
}

export interface ServerConfig {
  workspaceRoot: string;
  watchPatterns: string[];
  ignoredPatterns: string[];
}

export interface IChangeTracker {
  getChangedFiles(): string[];
  markDirty(file: string): void;
  refresh(): RefreshResult;
  getStatus(): {
    dirty: boolean;
    version: number;
    lastScan: Date;
    changedFiles: string[];
  };
}

export interface IFileWatcher {
  start(workspaceRoot: string): void;
  on(event: 'change', callback: (path: string) => void): void;
  stop(): void;
}

export interface INpmManager {
  install(packageName: string, isDev?: boolean): Promise<DependencyOperation>;
  uninstall(packageName: string): Promise<DependencyOperation>;
}

export interface IFileUtils {
  getDependencies(workspaceRoot: string): Record<string, string>;
  fileExists(filePath: string): boolean;
  readJsonFile(filePath: string): any;
  readTextFile(filePath: string): string;
}

// Tool handler function signatures
export type ToolHandler = (args: any) => Promise<{
  content: Array<{
    type: 'text';
    text: string;
  }>;
}>;

export type ResourceHandler = (uri: string) => Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}>;
