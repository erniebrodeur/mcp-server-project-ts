/**
 * Tool definitions and handlers
 */

import { Tool, ListToolsRequestSchema, CallToolRequestSchema } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils, ToolHandler, IFileMetadataService, ICacheManager } from "../types/index.js";
import { TypeScriptCache } from "../cache/typescript-cache.js";
import { LintCache } from "../cache/lint-cache.js";
import { TestCache } from "../cache/test-cache.js";
import { ProjectOutlineGenerator } from "../analysis/project-outline.js";
import { FileSummaryGenerator } from "../analysis/file-summary.js";

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
];

export function createToolHandlers(
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
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
  workspaceRoot: string
): void {
  const handlers = createToolHandlers(changeTracker, npmManager, fileUtils, fileMetadataService, cacheManager, workspaceRoot);

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
