// Project structure analysis tools

import { Tool } from "../../types/mcp.js";
import type { IFileMetadataService, ICacheManager, ToolHandler } from "../../types/index.js";
import { ProjectOutlineGenerator } from "../../analysis/project-outline.js";

export const analysisTools: Tool[] = [
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
];
