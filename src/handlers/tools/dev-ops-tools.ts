// Development operations tools (compile, lint, test)

import { Tool } from "../../types/mcp.js";
import type { IFileMetadataService, ICacheManager, ToolHandler } from "../../types/index.js";
import { TypeScriptCache } from "../../cache/typescript-cache.js";
import { LintCache } from "../../cache/lint-cache.js";
import { TestCache } from "../../cache/test-cache.js";

export const devOpsTools: Tool[] = [
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
];

export function createDevOpsHandlers(
  cacheManager: ICacheManager,
  fileMetadataService: IFileMetadataService,
  workspaceRoot: string
): Record<string, ToolHandler> {
  // Initialize cache services
  const typeScriptCache = new TypeScriptCache(cacheManager, fileMetadataService, workspaceRoot);
  const lintCache = new LintCache(cacheManager, fileMetadataService, workspaceRoot);
  const testCache = new TestCache(cacheManager, fileMetadataService, workspaceRoot);

  return {
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
  result.diagnostics.map((d: any) => 
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
          filesWithIssues: results.filter((r: any) => r.issues.length > 0).length,
          totalIssues: results.reduce((sum: number, r: any) => sum + r.issues.length, 0),
          errors: results.reduce((sum: number, r: any) => sum + r.issues.filter((i: any) => i.severity === 'error').length, 0),
          warnings: results.reduce((sum: number, r: any) => sum + r.issues.filter((i: any) => i.severity === 'warning').length, 0),
          files: results.map((r: any) => ({
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
              cachedResult = results.filter((r: any) => r !== undefined);
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
  };
}
