/**
 * MCP Server – TypeScript/JavaScript Project Change Tracker
 * ----------------------------------------------------------
 * A proper MCP-compliant server that provides:
 *  • File change tracking with notifications
 *  • Dependency management via npm
 *  • Structured tool descriptions for AI agents
 * 
 * Tools provided:
 *  - get_project_status    (get list of changed files and project info)
 *  - refresh_changes       (clear changed files list)
 *  - install_dependency    (npm install packages)
 *  - uninstall_dependency  (npm uninstall packages)
 *
 * NOTE: Server ONLY tracks which files changed - agents read files themselves.
 * No file content reading, no parsing, just change notifications.
 */

import { parseCliArgs, createServerConfig, createCacheConfig } from "./core/config.js";
import { createMcpServer, setupServerHandlers, startServer } from "./core/server.js";
import { FileWatcher } from "./tracking/file-watcher.js";
import { ChangeTracker } from "./tracking/change-tracker.js";
import { NpmManager } from "./dependencies/npm-manager.js";
import { FileUtils } from "./utils/file-utils.js";
import { CacheManager } from "./cache/cache-manager.js";
import { CacheMonitor } from "./cache/cache-monitor.js";
import { FileMetadataService } from "./cache/file-metadata.js";
import { OperationCache } from "./cache/operation-cache.js";
import { CachedResourceManager } from "./cache/cached-resource-manager.js";
import { TypeScriptCache } from "./cache/typescript-cache.js";
import { LintCache } from "./cache/lint-cache.js";
import { TestCache } from "./cache/test-cache.js";
import { ProjectOutlineGenerator } from "./analysis/project-outline.js";
import { FileSummaryGenerator } from "./analysis/file-summary.js";

async function main() {
  // Parse CLI arguments and setup configuration
  const { workspaceRoot } = parseCliArgs();
  const config = createServerConfig(workspaceRoot);

  // Initialize components
  const changeTracker = new ChangeTracker();
  const fileWatcher = new FileWatcher();
  const npmManager = new NpmManager(workspaceRoot);
  const fileUtils = new FileUtils();
  
  // Phase 6: Create cache configuration and monitoring
  const cacheConfig = createCacheConfig();
  const cacheManager = new CacheManager(cacheConfig);
  const cacheMonitor = new CacheMonitor(cacheManager, cacheConfig);
  
  const fileMetadataService = new FileMetadataService(cacheManager);
  const operationCache = new OperationCache(cacheManager, fileMetadataService);

  // Initialize Phase 3 cache services
  const typescriptCache = new TypeScriptCache(cacheManager, fileMetadataService, workspaceRoot);
  const lintCache = new LintCache(cacheManager, fileMetadataService, workspaceRoot);
  const testCache = new TestCache(cacheManager, fileMetadataService, workspaceRoot);

  // Initialize Phase 4 analysis services
  const projectOutlineGenerator = new ProjectOutlineGenerator(cacheManager, fileMetadataService, workspaceRoot);
  const fileSummaryGenerator = new FileSummaryGenerator(cacheManager, fileMetadataService, workspaceRoot);

  // Initialize Phase 5 cached resource manager
  const cachedResourceManager = new CachedResourceManager(
    cacheManager,
    fileMetadataService,
    typescriptCache,
    lintCache,
    testCache,
    projectOutlineGenerator,
    fileSummaryGenerator,
    workspaceRoot
  );

  // Setup file watching
  fileWatcher.start(workspaceRoot, config);
  fileWatcher.on('change', (filePath) => {
    changeTracker.markDirty(filePath);
    // Clear cache for changed files
    fileMetadataService.clearMetadataCache(filePath);
    // Invalidate operation cache for changed files
    operationCache.invalidateByFiles([filePath]);
  });

  // Phase 6: Start cache monitoring
  cacheMonitor.startMonitoring();
  if (cacheConfig.enableAutoCleanup) {
    cacheMonitor.startAutoCleanup();
  }

  // Create and configure MCP server
  const server = createMcpServer();
  setupServerHandlers(
    server, 
    changeTracker, 
    npmManager, 
    fileUtils, 
    fileMetadataService, 
    cacheManager, 
    cacheMonitor,
    workspaceRoot,
    cachedResourceManager
  );

  // Start the server
  await startServer(server);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Cleanup on process exit
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});