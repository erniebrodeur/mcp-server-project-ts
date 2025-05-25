/**
 * Shared types and interfaces for the MCP Project Change Tracker
 */

// Re-export cache types for convenience
export type {
  FileMetadata,
  CacheConfiguration,
  CacheStats,
  CachedOperationResult,
  TypeScriptCheckResult,
  LintResult,
  TestResult,
  OperationType,
  FileChangeComparisonResult,
  BatchFileChangeResult,
  ICacheManager,
  IFileMetadataService,
  IOperationCache,
  // Phase 4: Project Analysis types
  ProjectOutline,
  DirectoryNode,
  ProjectStats,
  FileType,
  FileSummary,
  IProjectAnalysis,
  ProjectOutlineOptions,
  // Phase 5: Resource types
  CachedResourceData,
  MetadataResource,
  ProjectStructureResource,
  CacheResourceSummary,
  ICachedResourceManager,
  // Phase 6: Cache monitoring types
  ICacheMonitor,
  CacheMonitoringData,
  CacheHealthMetrics,
} from "./cache.js";

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
  // Enhanced change tracking methods
  getChangesSince(timestamp: Date): string[];
  getChangesSinceVersion(version: number): string[];
  getChangeHistory(): Array<{ file: string; timestamp: Date; version: number }>;
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
