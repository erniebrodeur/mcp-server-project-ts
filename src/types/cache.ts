/**
 * Cache layer types and interfaces
 */

export interface FileMetadata {
  path: string;
  size: number;
  lastModified: Date;
  contentHash: string;
  exists: boolean;
}

export interface CacheConfiguration {
  // TTL settings for different operation types (in seconds)
  fileMetadataTTL: number;
  operationResultTTL: number;
  projectStructureTTL: number;
  
  // Memory management
  maxKeys: number;
  checkPeriod: number; // How often to check for expired keys
  
  // Performance settings
  useClones: boolean; // Whether to clone objects when storing/retrieving
  
  // Cache warming settings
  enableWarmup: boolean;
  warmupBatchSize: number;
  warmupDelay: number; // ms between batches
  
  // Auto-cleanup settings
  enableAutoCleanup: boolean;
  cleanupThreshold: number; // Memory usage threshold (0-1)
  cleanupInterval: number; // ms between cleanup checks
  
  // Performance monitoring
  enableMonitoring: boolean;
  monitoringInterval: number; // ms between monitoring checks
  logPerformanceThreshold: number; // Hit rate threshold for logging warnings (0-1)
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number; // Key size in memory
  vsize: number; // Value size in memory
}

export interface CachedOperationResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: Date;
  fileHashes: Record<string, string>; // Files that influenced this result
}

export interface TypeScriptCheckResult extends CachedOperationResult {
  diagnostics: Array<{
    file?: string;
    line?: number;
    column?: number;
    message: string;
    category: 'error' | 'warning' | 'info';
  }>;
}

export interface LintResult extends CachedOperationResult {
  filePath: string;
  issues: Array<{
    line: number;
    column: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

export interface TestResult extends CachedOperationResult {
  testFiles: string[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // milliseconds
}

export type OperationType = 'typescript' | 'lint' | 'test' | 'metadata' | 'structure';

export interface CacheEntry<T = any> {
  value: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

export interface FileChangeComparisonResult {
  path: string;
  changed: boolean;
  reason?: 'content' | 'size' | 'timestamp' | 'missing' | 'new';
  oldHash?: string;
  newHash?: string;
}

export interface BatchFileChangeResult {
  changedFiles: FileChangeComparisonResult[];
  totalChecked: number;
  changedCount: number;
}

export interface ICacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): boolean;
  del(key: string): number;
  clear(): void;
  getStats(): CacheStats;
  has(key: string): boolean;
  keys(): string[];
  flushAll(): void;
  // Enhanced methods
  generateKey(prefix: string, ...parts: string[]): string;
  setWithOperationTTL<T>(key: string, value: T, operationType: 'metadata' | 'operation' | 'structure'): boolean;
  getKeysByPattern(pattern: RegExp): string[];
  deleteKeysByPattern(pattern: RegExp): number;
  getEfficiencyRatio(): number;
  logPerformanceSummary(): void;
}

export interface IFileMetadataService {
  getMetadata(filePath: string): Promise<FileMetadata>;
  getMetadataBatch(filePaths: string[]): Promise<FileMetadata[]>;
  compareWithHashes(filePathsWithHashes: Record<string, string>): Promise<BatchFileChangeResult>;
  calculateHash(filePath: string): Promise<string>;
  clearMetadataCache(filePath?: string): void;
  warmCache(filePaths: string[]): Promise<void>;
}

export interface IOperationCache {
  cacheOperation(operationType: OperationType, key: string, result: CachedOperationResult): void;
  getCachedOperation(operationType: OperationType, key: string): CachedOperationResult | undefined;
  invalidateByFiles(changedFiles: string[]): void;
  getOperationStats(operationType: OperationType): { hits: number; misses: number };
}

// Phase 4: Project State Summary Types

export interface ProjectOutline {
  structure: DirectoryNode;
  stats: ProjectStats;
  fileTypes: Record<string, number>;
  timestamp: Date;
}

export interface DirectoryNode {
  name: string;
  type: 'directory' | 'file';
  path: string;
  children?: DirectoryNode[];
  fileType?: FileType;
  size?: number;
}

export interface ProjectStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  filesByExtension: Record<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
}

export type FileType = 
  | 'typescript' | 'javascript' | 'jsx' | 'tsx'
  | 'config' | 'test' | 'documentation' | 'style'
  | 'asset' | 'data' | 'build' | 'other';

export interface FileSummary {
  path: string;
  fileType: FileType;
  exports?: string[];
  imports?: string[];
  description?: string;
  size: number;
  lastModified: Date;
  contentHash: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface IProjectAnalysis {
  getProjectOutline(options?: ProjectOutlineOptions): Promise<ProjectOutline>;
  getFileSummary(filePath: string): Promise<FileSummary>;
  getFileSummaries(filePaths: string[]): Promise<FileSummary[]>;
  classifyFileType(filePath: string): FileType;
  clearAnalysisCache(filePath?: string): void;
}

export interface ProjectOutlineOptions {
  maxDepth?: number;
  excludePatterns?: string[];
  includeHidden?: boolean;
  includeSizes?: boolean;
}

// Phase 5: Anti-Duplication Resource Types

export interface CachedResourceData {
  uri: string;
  lastUpdated: Date;
  cacheKey: string;
  version: string;
  data: any;
}

export interface MetadataResource {
  files: Record<string, {
    hash: string;
    size: number;
    lastModified: Date;
    path: string;
  }>;
  lastUpdated: Date;
  totalFiles: number;
}

export interface ProjectStructureResource {
  structure: DirectoryNode;
  stats: ProjectStats;
  lastUpdated: Date;
  version: string;
}

export interface CacheResourceSummary {
  typescript?: {
    lastRun: Date;
    success: boolean;
    issueCount: number;
    version: string;
  };
  lint?: {
    lastRun: Date;
    totalFiles: number;
    issuesCount: number;
    version: string;
  };
  test?: {
    lastRun: Date;
    totalTests: number;
    passed: number;
    failed: number;
    version: string;
  };
}

export interface ICachedResourceManager {
  generateCacheResource(cacheType: 'typescript' | 'lint' | 'test'): Promise<CachedResourceData | null>;
  generateMetadataResource(resourceType: 'file-hashes' | 'project-structure'): Promise<CachedResourceData>;
  getResourceVersion(resourceUri: string): string;
  isResourceStale(resourceUri: string, maxAge?: number): Promise<boolean>;
  getCacheResourceSummary(): Promise<CacheResourceSummary>;
}

// Monitoring and Health Metrics Interfaces

export interface ICacheMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  startAutoCleanup(): void;
  stopAutoCleanup(): void;
  getHealthMetrics(): CacheHealthMetrics;
  getCurrentMonitoringData(): CacheMonitoringData;
  getPerformanceHistory(limit?: number): CacheMonitoringData[];
  performCleanup(strategy?: 'lru' | 'size' | 'age' | 'pattern', options?: any): number;
  generatePerformanceReport(): string;
  dispose(): void;
}

export interface CacheMonitoringData {
  timestamp: Date;
  stats: CacheStats;
  health: CacheHealthMetrics;
  memoryUsageBytes: number;
  operationsPerSecond: number;
  averageResponseTime: number;
}

export interface CacheHealthMetrics {
  efficiency: number; // Hit rate (0-1)
  memoryUsage: number; // Memory usage percentage (0-1)
  keyCount: number;
  uptime: number; // Uptime in milliseconds
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
  recommendations: string[];
}

// Ensure this file is treated as a module
export {};
