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
