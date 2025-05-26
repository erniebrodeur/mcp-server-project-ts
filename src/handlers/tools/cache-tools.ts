// Cache management and monitoring tools

import { Tool } from "../../types/mcp.js";
import type { IFileMetadataService, ICacheManager, ICacheMonitor, ToolHandler } from "../../types/index.js";
import { TypeScriptCache } from "../../cache/typescript-cache.js";
import { LintCache } from "../../cache/lint-cache.js";
import { TestCache } from "../../cache/test-cache.js";
import { ProjectOutlineGenerator } from "../../analysis/project-outline.js";
import { FileSummaryGenerator } from "../../analysis/file-summary.js";

export const cacheTools: Tool[] = [
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

export function createCacheHandlers(
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  fileMetadataService: IFileMetadataService,
  workspaceRoot: string
): Record<string, ToolHandler> {
  // Initialize cache services
  const typeScriptCache = new TypeScriptCache(cacheManager, fileMetadataService, workspaceRoot);
  const lintCache = new LintCache(cacheManager, fileMetadataService, workspaceRoot);
  const testCache = new TestCache(cacheManager, fileMetadataService, workspaceRoot);
  const projectOutlineGenerator = new ProjectOutlineGenerator(cacheManager, fileMetadataService, workspaceRoot);
  const fileSummaryGenerator = new FileSummaryGenerator(cacheManager, fileMetadataService, workspaceRoot);

  return {
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
${health.recommendations.map((rec: string) => `- ${rec}`).join('\n')}`;

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
            // Cache warming completed silently
          }).catch(error => {
            // Cache warming error handled silently
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
}
