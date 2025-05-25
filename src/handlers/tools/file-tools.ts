// File metadata and content analysis tools

import { Tool } from "../../types/mcp.js";
import type { IFileMetadataService, ToolHandler } from "../../types/index.js";
import { FileSummaryGenerator } from "../../analysis/file-summary.js";

export const fileTools: Tool[] = [
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
