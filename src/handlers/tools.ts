/**
 * Tool definitions and handlers
 */

import { Tool, ListToolsRequestSchema, CallToolRequestSchema } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils, ToolHandler, IFileMetadataService, ICacheManager, ICacheMonitor } from "../types/index.js";
import { TypeScriptCache } from "../cache/typescript-cache.js";
import { LintCache } from "../cache/lint-cache.js";
import { TestCache } from "../cache/test-cache.js";
import { ProjectOutlineGenerator } from "../analysis/project-outline.js";
import { FileSummaryGenerator } from "../analysis/file-summary.js";
import { CacheMonitor } from "../cache/cache-monitor.js";

export const tools: Tool[] = [
  {
    name: "get_project_status",
    description: "Get the current status of file changes and project dependencies. This tool provides a comprehensive overview of what has changed in the project since the last refresh, including version tracking and dependency information.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "refresh_changes",
    description: "Clear the changed files list and get information about what was cleared. Use this after processing all changed files to reset the tracking state. This increments the version counter and updates the last scan timestamp.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "install_dependency",
    description: "Install an npm package as a dependency or dev dependency. This tool runs 'npm install' with the specified package name and options. Use isDev: true to install as a development dependency.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: {
          type: "string",
          description: "The name of the npm package to install (e.g., 'lodash', '@types/node')",
        },
        isDev: {
          type: "boolean",
          description: "Whether to install as a development dependency (adds --save-dev flag)",
          default: false,
        },
      },
      required: ["packageName"],
      additionalProperties: false,
    },
  },
  {
    name: "uninstall_dependency",
    description: "Uninstall an npm package from the project. This tool runs 'npm uninstall' with the specified package name, removing it from both dependencies and devDependencies in package.json.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: {
          type: "string",
          description: "The name of the npm package to uninstall",
        },
      },
      required: ["packageName"],
      additionalProperties: false,
    },
  },
  {
    name: "get_file_metadata",
    description: "Get file metadata (size, last modified, content hash) without reading the file content. This allows agents to check if files need re-reading without loading the content first, significantly improving efficiency for large files.",
    inputSchema: {
      type: "object",
      properties: {
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of file paths to get metadata for (can be relative or absolute paths)",
        },
      },
      required: ["filePaths"],
      additionalProperties: false,
    },
  },
  {
    name: "has_file_changed",
    description: "Check which files have actually changed by comparing current content hashes with provided hashes. This is the core anti-duplication tool - agents can avoid re-reading files that haven't actually changed.",
    inputSchema: {
      type: "object",
      properties: {
        fileHashMap: {
          type: "object",
          description: "Object mapping file paths to their last-known content hashes",
          additionalProperties: {
            type: "string"
          },
        },
      },
      required: ["fileHashMap"],
      additionalProperties: false,
    },
  },
  {
    name: "cache_typescript_check",
    description: "Run TypeScript compilation check (tsc --noEmit) and cache the results. Subsequent calls will use cached results unless relevant files have changed, significantly speeding up repeated type checking.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "cache_lint_results",
    description: "Run ESLint on specified files and cache the results per file. Only re-lints files that have actually changed since the last run.",
    inputSchema: {
      type: "object",
      properties: {
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of file paths to lint (if empty, lints entire project)",
          default: [],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cache_test_results",
    description: "Run the test suite and cache results. Only re-runs tests when relevant source files or test files have changed.",
    inputSchema: {
      type: "object",
      properties: {
        testPattern: {
          type: "string",
          description: "Optional test pattern to run specific tests (e.g., test file names or patterns)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_cached_operation",
    description: "Retrieve cached results from expensive operations (TypeScript check, lint, tests) without re-running them. Returns cache miss if no valid cached result exists.",
    inputSchema: {
      type: "object",
      properties: {
        operationType: {
          type: "string",
          enum: ["typescript", "lint", "test"],
          description: "Type of operation to get cached results for",
        },
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional file paths filter for lint operations",
        },
        testPattern: {
          type: "string",
          description: "Optional test pattern for test operations",
        },
      },
      required: ["operationType"],
      additionalProperties: false,
    },
  },
  {
    name: "get_project_outline",
    description: "Generate a high-level project structure overview without reading file contents. Shows directory tree, file types distribution, and project statistics with caching for performance.",
    inputSchema: {
      type: "object",
      properties: {
        maxDepth: {
          type: "number",
          description: "Maximum directory depth to traverse (default: 10)",
          default: 10,
        },
        excludePatterns: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Glob patterns to exclude (default: ['node_modules/**', 'dist/**', 'build/**', '.git/**'])",
          default: ["node_modules/**", "dist/**", "build/**", ".git/**"],
        },
        includeHidden: {
          type: "boolean",
          description: "Include hidden files and directories (default: false)",
          default: false,
        },
        includeSizes: {
          type: "boolean",
          description: "Include file sizes in the output (default: true)",
          default: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_file_summary",
    description: "Get a lightweight summary of a file including its type, exports, imports, and complexity without loading full content. Useful for understanding file purpose quickly.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the file to summarize",
        },
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of file paths to summarize (alternative to single filePath)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "clear_cache",
    description: "Clear cache entries by type, pattern, or clear all cache. Use this tool to force refresh cached data or free up memory.",
    inputSchema: {
      type: "object",
      properties: {
        cacheType: {
          type: "string",
          enum: ["all", "metadata", "operations", "structure", "typescript", "lint", "test"],
          description: "Type of cache to clear",
        },
        pattern: {
          type: "string",
          description: "Optional regex pattern to match cache keys for selective clearing",
        },
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional specific file paths to clear from cache",
        },
      },
      required: ["cacheType"],
      additionalProperties: false,
    },
  },
  {
    name: "get_cache_stats",
    description: "Get comprehensive cache performance statistics including hit rates, memory usage, and health metrics.",
    inputSchema: {
      type: "object",
      properties: {
        includeHistory: {
          type: "boolean",
          description: "Include performance history data (default: false)",
          default: false,
        },
        historyLimit: {
          type: "number",
          description: "Maximum number of history entries to return (default: 50)",
          default: 50,
        },
        generateReport: {
          type: "boolean",
          description: "Generate a detailed performance report (default: false)",
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "warm_cache",
    description: "Pre-populate cache with common operations to improve performance. Useful after startup or cache clearing.",
    inputSchema: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: {
            type: "string",
            enum: ["metadata", "project-structure", "file-summaries", "typescript", "lint", "all"]
          },
          description: "Types of operations to warm up",
          default: ["metadata", "project-structure"],
        },
        filePaths: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Specific file paths to warm cache for (optional)",
        },
        backgroundMode: {
          type: "boolean",
          description: "Run cache warming in background without blocking (default: true)",
          default: true,
        },
      },
      additionalProperties: false,
    },
  },
];

export function createToolHandlers(
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  workspaceRoot: string
) {
  // Initialize cache services
  const typeScriptCache = new TypeScriptCache(cacheManager, fileMetadataService, workspaceRoot);
  const lintCache = new LintCache(cacheManager, fileMetadataService, workspaceRoot);
  const testCache = new TestCache(cacheManager, fileMetadataService, workspaceRoot);

  // Initialize Phase 4 analysis services
  const projectOutlineGenerator = new ProjectOutlineGenerator(cacheManager, fileMetadataService, workspaceRoot);
  const fileSummaryGenerator = new FileSummaryGenerator(cacheManager, fileMetadataService, workspaceRoot);

  const handlers: Record<string, ToolHandler> = {
    get_project_status: async () => {
      const status = changeTracker.getStatus();
      const dependencies = fileUtils.getDependencies(workspaceRoot);

      return {
        content: [
          {
            type: "text",
            text: `Project Status:
- Dirty: ${status.dirty}
- Version: ${status.version}
- Last Scan: ${status.lastScan.toISOString()}
- Changed Files (${status.changedFiles.length}): ${status.changedFiles.length > 0 ? '\n  ' + status.changedFiles.join('\n  ') : 'none'}
- Workspace: ${workspaceRoot}
- Dependencies: ${Object.keys(dependencies).length} packages installed`,
          },
        ],
      };
    },

    refresh_changes: async () => {
      const result = changeTracker.refresh();

      return {
        content: [
          {
            type: "text",
            text: `Changes refreshed:
- Cleared ${result.cleared} changed files
- Previous version: ${result.previousVersion}
- New version: ${changeTracker.getStatus().version}
- Files that were cleared: ${result.changedFiles.length > 0 ? '\n  ' + result.changedFiles.join('\n  ') : 'none'}`,
          },
        ],
      };
    },

    install_dependency: async (args: any) => {
      const { packageName, isDev } = args as { packageName: string; isDev?: boolean };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await npmManager.install(packageName, Boolean(isDev));
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Successfully installed ${packageName}${isDev ? ' as dev dependency' : ''}:\n${result.output}`
              : `Failed to install ${packageName}:\n${result.error || result.output}`,
          },
        ],
      };
    },

    uninstall_dependency: async (args: any) => {
      const { packageName } = args as { packageName: string };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await npmManager.uninstall(packageName);
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Successfully uninstalled ${packageName}:\n${result.output}`
              : `Failed to uninstall ${packageName}:\n${result.error || result.output}`,
          },
        ],
      };
    },

    get_file_metadata: async (args: any) => {
      const { filePaths } = args as { filePaths: string[] };
      
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new Error("filePaths is required and must be a non-empty array");
      }

      try {
        const metadata = await fileMetadataService.getMetadataBatch(filePaths);
        
        const results = metadata.map(meta => ({
          path: meta.path,
          size: meta.size,
          lastModified: meta.lastModified.toISOString(),
          contentHash: meta.contentHash,
          exists: meta.exists,
        }));

        return {
          content: [
            {
              type: "text",
              text: `File metadata for ${filePaths.length} files:\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get file metadata: ${error.message}`);
      }
    },

    has_file_changed: async (args: any) => {
      const { fileHashMap } = args as { fileHashMap: Record<string, string> };
      
      if (!fileHashMap || typeof fileHashMap !== "object") {
        throw new Error("fileHashMap is required and must be an object");
      }

      try {
        const result = await fileMetadataService.compareWithHashes(fileHashMap);
        
        const summary = {
          totalChecked: result.totalChecked,
          changedCount: result.changedCount,
          changedFiles: result.changedFiles.map(file => ({
            path: file.path,
            changed: file.changed,
            reason: file.reason,
            oldHash: file.oldHash,
            newHash: file.newHash,
          })),
        };

        return {
          content: [
            {
              type: "text", 
              text: `File change analysis:\n${JSON.stringify(summary, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to check file changes: ${error.message}`);
      }
    },

    cache_typescript_check: async () => {
      try {
        const result = await typeScriptCache.checkTypeScript();
        
        return {
          content: [
            {
              type: "text",
              text: `TypeScript Check Results:
Success: ${result.success}
Timestamp: ${result.timestamp.toISOString()}
Diagnostics: ${result.diagnostics.length} issues found

${result.diagnostics.length > 0 ? 
  result.diagnostics.map(d => 
    `${d.file ? `${d.file}:${d.line}:${d.column}` : 'General'} - ${d.category}: ${d.message}`
  ).join('\n') : 'No issues found!'
}

${result.error ? `Error: ${result.error}` : ''}
${result.output ? `Output: ${result.output}` : ''}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to run TypeScript check: ${error.message}`);
      }
    },

    cache_lint_results: async (args: any) => {
      try {
        const { filePaths = [] } = args as { filePaths?: string[] };
        
        let results: any[];
        if (filePaths.length > 0) {
          results = await lintCache.lintFiles(filePaths);
        } else {
          results = await lintCache.lintProject();
        }
        
        const summary = {
          totalFiles: results.length,
          filesWithIssues: results.filter(r => r.issues.length > 0).length,
          totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
          errors: results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.severity === 'error').length, 0),
          warnings: results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.severity === 'warning').length, 0),
          files: results.map(r => ({
            file: r.filePath,
            issues: r.issues.length,
            errors: r.issues.filter((i: any) => i.severity === 'error').length,
            warnings: r.issues.filter((i: any) => i.severity === 'warning').length,
            success: r.success
          }))
        };
        
        return {
          content: [
            {
              type: "text",
              text: `Lint Results Summary:
Total Files: ${summary.totalFiles}
Files with Issues: ${summary.filesWithIssues}
Total Issues: ${summary.totalIssues} (${summary.errors} errors, ${summary.warnings} warnings)

${JSON.stringify(summary, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to run lint check: ${error.message}`);
      }
    },

    cache_test_results: async (args: any) => {
      try {
        const { testPattern } = args as { testPattern?: string };
        
        const result = await testCache.runTests(testPattern);
        
        return {
          content: [
            {
              type: "text",
              text: `Test Results:
Success: ${result.success}
Timestamp: ${result.timestamp.toISOString()}
Duration: ${result.duration}ms

Results:
- Passed: ${result.passed}
- Failed: ${result.failed}
- Skipped: ${result.skipped}
- Test Files: ${result.testFiles.join(', ')}

${result.error ? `Error: ${result.error}` : ''}
${result.output ? `Output: ${result.output}` : ''}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to run tests: ${error.message}`);
      }
    },

    get_cached_operation: async (args: any) => {
      try {
        const { operationType, filePaths, testPattern } = args as { 
          operationType: 'typescript' | 'lint' | 'test';
          filePaths?: string[];
          testPattern?: string;
        };
        
        let cachedResult: any;
        
        switch (operationType) {
          case 'typescript':
            cachedResult = await typeScriptCache.getCachedResult();
            break;
          case 'lint':
            if (filePaths && filePaths.length > 0) {
              const results = await lintCache.getCachedResults(filePaths);
              cachedResult = results.filter(r => r !== undefined);
            } else {
              // For project-wide lint, we'd need to implement a different approach
              cachedResult = null;
            }
            break;
          case 'test':
            cachedResult = await testCache.getCachedResult(testPattern);
            break;
          default:
            throw new Error(`Unsupported operation type: ${operationType}`);
        }
        
        if (!cachedResult || (Array.isArray(cachedResult) && cachedResult.length === 0)) {
          return {
            content: [
              {
                type: "text",
                text: `Cache miss: No valid cached results found for ${operationType} operation.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Cached ${operationType} results:
${JSON.stringify(cachedResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get cached operation: ${error.message}`);
      }
    },

    get_project_outline: async (args: any) => {
      try {
        const { maxDepth, excludePatterns, includeHidden, includeSizes } = args as {
          maxDepth?: number;
          excludePatterns?: string[];
          includeHidden?: boolean;
          includeSizes?: boolean;
        };

        const outline = await projectOutlineGenerator.getProjectOutline({
          maxDepth,
          excludePatterns,
          includeHidden,
          includeSizes,
        });

        // Helper function to format bytes
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        };

        // Helper function to format directory tree
        const formatDirectoryTree = (node: any, depth: number = 0): string => {
          const indent = '  '.repeat(depth);
          const icon = node.type === 'directory' ? '📁' : '📄';
          const sizeInfo = node.size ? ` (${formatBytes(node.size)})` : '';
          let result = `${indent}${icon} ${node.name}${sizeInfo}\n`;
          
          if (node.children) {
            for (const child of node.children) {
              result += formatDirectoryTree(child, depth + 1);
            }
          }
          
          return result;
        };

        const treeView = formatDirectoryTree(outline.structure);
        
        const fileTypesList = Object.entries(outline.fileTypes)
          .sort(([,a], [,b]) => b - a)
          .map(([type, count]) => `  ${type}: ${count} files`)
          .join('\n');

        return {
          content: [
            {
              type: "text",
              text: `Project Outline (Generated: ${outline.timestamp.toISOString()})

📊 Project Statistics:
  Total Files: ${outline.stats.totalFiles}
  Total Directories: ${outline.stats.totalDirectories}
  Total Size: ${formatBytes(outline.stats.totalSize)}

📋 File Types Distribution:
${fileTypesList}

🌳 Directory Structure:
${treeView}

Raw Data:
${JSON.stringify(outline, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to generate project outline: ${error.message}`);
      }
    },

    get_file_summary: async (args: any) => {
      try {
        const { filePath, filePaths } = args as {
          filePath?: string;
          filePaths?: string[];
        };

        if (filePath && filePaths) {
          throw new Error("Provide either filePath or filePaths, not both");
        }

        if (!filePath && !filePaths) {
          throw new Error("Either filePath or filePaths is required");
        }

        if (filePath) {
          // Single file summary
          const summary = await fileSummaryGenerator.getFileSummary(filePath);
          
          const exports = summary.exports || [];
          const imports = summary.imports || [];
          
          return {
            content: [
              {
                type: "text",
                text: `File Summary for: ${summary.path}

📄 File Type: ${summary.fileType}
📏 Size: ${summary.size} bytes
⚡ Complexity: ${summary.complexity || 'unknown'}
🕒 Last Modified: ${summary.lastModified.toISOString()}

${summary.description ? `📝 Description: ${summary.description}\n` : ''}
📤 Exports (${exports.length}): ${exports.length > 0 ? '\n  ' + exports.join('\n  ') : 'none'}

📥 Imports (${imports.length}): ${imports.length > 0 ? '\n  ' + imports.join('\n  ') : 'none'}

Raw Data:
${JSON.stringify(summary, null, 2)}`,
              },
            ],
          };
        } else {
          // Multiple files summary
          const summaries = await fileSummaryGenerator.getFileSummaries(filePaths!);
          
          const summaryText = summaries.map(summary => {
            const exports = summary.exports || [];
            const imports = summary.imports || [];
            return `📄 ${summary.path} (${summary.fileType}, ${summary.size} bytes, ${summary.complexity || 'unknown'} complexity)
   Exports: ${exports.length} | Imports: ${imports.length}${summary.description ? `\n   ${summary.description}` : ''}`;
          }).join('\n\n');

          return {
            content: [
              {
                type: "text",
                text: `File Summaries for ${summaries.length} files:

${summaryText}

Raw Data:
${JSON.stringify(summaries, null, 2)}`,
              },
            ],
          };
        }
      } catch (error: any) {
        throw new Error(`Failed to generate file summary: ${error.message}`);
      }
    },

    clear_cache: async (args: { cacheType: string; pattern?: string; filePaths?: string[] }) => {
      try {
        const { cacheType, pattern, filePaths } = args;
        let clearedCount = 0;
        let details = '';

        switch (cacheType) {
          case 'all':
            cacheManager.clear();
            clearedCount = -1; // Indicate full clear
            details = 'All cache entries cleared';
            break;
          case 'metadata':
            clearedCount = cacheManager.deleteKeysByPattern(/^metadata:/);
            details = `Cleared ${clearedCount} metadata cache entries`;
            break;
          case 'operations':
            clearedCount = cacheManager.deleteKeysByPattern(/^operation:/);
            details = `Cleared ${clearedCount} operation cache entries`;
            break;
          case 'structure':
            clearedCount = cacheManager.deleteKeysByPattern(/^structure:/);
            details = `Cleared ${clearedCount} structure cache entries`;
            break;
          case 'typescript':
            clearedCount = typeScriptCache.clearCache();
            details = `Cleared ${clearedCount} TypeScript cache entries`;
            break;
          case 'lint':
            if (filePaths) {
              clearedCount = lintCache.clearCache(filePaths);
              details = `Cleared lint cache for ${filePaths.length} specific files`;
            } else {
              clearedCount = lintCache.clearCache();
              details = `Cleared ${clearedCount} lint cache entries`;
            }
            break;
          case 'test':
            clearedCount = testCache.clearCache();
            details = `Cleared ${clearedCount} test cache entries`;
            break;
          default:
            throw new Error(`Unknown cache type: ${cacheType}`);
        }

        if (pattern) {
          const patternRegex = new RegExp(pattern);
          const patternCleared = cacheManager.deleteKeysByPattern(patternRegex);
          clearedCount += patternCleared;
          details += `\nAdditionally cleared ${patternCleared} entries matching pattern: ${pattern}`;
        }

        return {
          content: [
            {
              type: "text",
              text: `Cache Clear Results:
${details}

Cache Statistics After Clear:
${JSON.stringify(cacheManager.getStats(), null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to clear cache: ${error.message}`);
      }
    },

    get_cache_stats: async (args: { includeHistory?: boolean; historyLimit?: number; generateReport?: boolean }) => {
      try {
        const { includeHistory = false, historyLimit = 50, generateReport = false } = args;
        
        const stats = cacheManager.getStats();
        const health = cacheMonitor.getHealthMetrics();
        const currentData = cacheMonitor.getCurrentMonitoringData();
        
        let response = `Cache Performance Statistics:

Health Status: ${health.status.toUpperCase()}
Hit Rate: ${(health.efficiency * 100).toFixed(1)}%
Memory Usage: ${(health.memoryUsage * 100).toFixed(1)}%
Total Keys: ${health.keyCount}
Uptime: ${Math.round(health.uptime / 1000 / 60)} minutes

Detailed Stats:
- Cache Hits: ${stats.hits}
- Cache Misses: ${stats.misses}
- Total Operations: ${stats.hits + stats.misses}
- Operations/Second: ${currentData.operationsPerSecond.toFixed(1)}
- Avg Response Time: ${currentData.averageResponseTime}ms

Memory Details:
- Key Storage: ${(stats.ksize / 1024).toFixed(1)}KB
- Value Storage: ${(stats.vsize / 1024).toFixed(1)}KB
- Total Memory: ${(currentData.memoryUsageBytes / 1024).toFixed(1)}KB

Recommendations:
${health.recommendations.map(rec => `- ${rec}`).join('\n')}`;

        if (generateReport) {
          response += '\n\n' + cacheMonitor.generatePerformanceReport();
        }

        if (includeHistory) {
          const history = cacheMonitor.getPerformanceHistory(historyLimit);
          response += `\n\nPerformance History (${history.length} entries):
${JSON.stringify(history, null, 2)}`;
        }

        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error: any) {
        throw new Error(`Failed to get cache stats: ${error.message}`);
      }
    },

    warm_cache: async (args: { operations?: string[]; filePaths?: string[]; backgroundMode?: boolean }) => {
      try {
        const { operations = ['metadata', 'project-structure'], filePaths, backgroundMode = true } = args;
        
        const results: string[] = [];
        let totalWarmed = 0;

        const warmingPromises: Promise<void>[] = [];

        for (const operation of operations) {
          switch (operation) {
            case 'metadata':
              if (filePaths) {
                const warmingPromise = fileMetadataService.warmCache(filePaths).then(() => {
                  totalWarmed += filePaths.length;
                  results.push(`Warmed metadata cache for ${filePaths.length} specific files`);
                });
                warmingPromises.push(warmingPromise);
              } else {
                const glob = await import('fast-glob');
                const allFiles = await glob.default(['**/*.{ts,tsx,js,jsx}', '!node_modules/**'], {
                  cwd: workspaceRoot,
                  absolute: true
                });
                const limitedFiles = allFiles.slice(0, 100); // Limit to avoid overwhelming
                const warmingPromise = fileMetadataService.warmCache(limitedFiles).then(() => {
                  totalWarmed += limitedFiles.length;
                  results.push(`Warmed metadata cache for ${limitedFiles.length} files`);
                });
                warmingPromises.push(warmingPromise);
              }
              break;
            case 'project-structure':
              const structurePromise = projectOutlineGenerator.getProjectOutline({}).then(() => {
                totalWarmed += 1;
                results.push('Warmed project structure cache');
              });
              warmingPromises.push(structurePromise);
              break;
            case 'file-summaries':
              if (filePaths) {
                const summaryPromise = fileSummaryGenerator.getFileSummaries(filePaths).then(() => {
                  totalWarmed += filePaths.length;
                  results.push(`Warmed file summary cache for ${filePaths.length} files`);
                });
                warmingPromises.push(summaryPromise);
              }
              break;
            case 'typescript':
              const tsPromise = typeScriptCache.checkTypeScript().then(() => {
                totalWarmed += 1;
                results.push('Warmed TypeScript compilation cache');
              });
              warmingPromises.push(tsPromise);
              break;
            case 'lint':
              const lintPromise = lintCache.lintProject().then(() => {
                totalWarmed += 1;
                results.push('Warmed lint results cache');
              });
              warmingPromises.push(lintPromise);
              break;
            case 'all':
              // For 'all', we'll process all other operations without recursion
              const allOperations = ['metadata', 'project-structure', 'file-summaries', 'typescript', 'lint'];
              for (const op of allOperations) {
                if (op !== 'all') {
                  // Process each operation individually
                  switch (op) {
                    case 'metadata':
                      if (filePaths && filePaths.length > 0) {
                        const metadataPromise = fileMetadataService.warmCache(filePaths).then(() => {
                          totalWarmed += filePaths.length;
                          results.push(`Warmed metadata cache for ${filePaths.length} files`);
                        });
                        warmingPromises.push(metadataPromise);
                      }
                      break;
                    case 'project-structure':
                      const structurePromise2 = projectOutlineGenerator.getProjectOutline({}).then(() => {
                        totalWarmed += 1;
                        results.push('Warmed project structure cache');
                      });
                      warmingPromises.push(structurePromise2);
                      break;
                    case 'file-summaries':
                      if (filePaths && filePaths.length > 0) {
                        const summaryPromise2 = fileSummaryGenerator.getFileSummaries(filePaths).then(() => {
                          totalWarmed += filePaths.length;
                          results.push(`Warmed file summaries cache for ${filePaths.length} files`);
                        });
                        warmingPromises.push(summaryPromise2);
                      }
                      break;
                    case 'typescript':
                      const tsPromise2 = typeScriptCache.checkTypeScript().then(() => {
                        totalWarmed += 1;
                        results.push('Warmed TypeScript compilation cache');
                      });
                      warmingPromises.push(tsPromise2);
                      break;
                    case 'lint':
                      const lintPromise2 = lintCache.lintProject().then(() => {
                        totalWarmed += 1;
                        results.push('Warmed lint results cache');
                      });
                      warmingPromises.push(lintPromise2);
                      break;
                  }
                }
              }
              break;
          }
        }

        if (backgroundMode) {
          // Start warming in background and return immediately
          Promise.allSettled(warmingPromises).then(() => {
            console.log(`Cache warming completed: ${results.join(', ')}`);
          }).catch(error => {
            console.error('Cache warming error:', error);
          });

          return {
            content: [
              {
                type: "text",
                text: `Cache warming started in background for operations: ${operations.join(', ')}
${filePaths ? `Targeting ${filePaths.length} specific files` : 'Using auto-discovered files'}

Warming operations will complete asynchronously. Use get_cache_stats to monitor progress.`,
              },
            ],
          };
        } else {
          // Wait for all warming operations to complete
          await Promise.allSettled(warmingPromises);

          return {
            content: [
              {
                type: "text",
                text: `Cache Warming Completed:
${results.join('\n')}

Total items warmed: ${totalWarmed}

Updated Cache Stats:
${JSON.stringify(cacheManager.getStats(), null, 2)}`,
              },
            ],
          };
        }
      } catch (error: any) {
        throw new Error(`Failed to warm cache: ${error.message}`);
      }
    },
  };

  return handlers;
}

export function registerToolHandlers(
  server: any,
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  workspaceRoot: string
): void {
  const handlers = createToolHandlers(changeTracker, npmManager, fileUtils, fileMetadataService, cacheManager, cacheMonitor, workspaceRoot);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    const handler = handlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  });
}
