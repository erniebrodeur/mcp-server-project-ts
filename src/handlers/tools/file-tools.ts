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

export function createFileHandlers(
  fileMetadataService: IFileMetadataService,
  fileSummaryGenerator: FileSummaryGenerator
): Record<string, ToolHandler> {
  return {
    get_file_metadata: async (args: any) => {
      const { filePaths } = args as { filePaths: string[] };
      
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new Error("filePaths is required and must be a non-empty array");
      }

      try {
        const metadata = await fileMetadataService.getMetadataBatch(filePaths);
        
        const results = metadata.map((meta: any) => ({
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
          
          const summaryText = summaries.map((summary: any) => {
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
}
