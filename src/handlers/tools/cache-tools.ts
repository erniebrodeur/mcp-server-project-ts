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
