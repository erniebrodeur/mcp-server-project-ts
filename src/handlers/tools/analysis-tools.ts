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

export function createAnalysisHandlers(
  cacheManager: ICacheManager,
  fileMetadataService: IFileMetadataService,
  workspaceRoot: string
): Record<string, ToolHandler> {
  // Initialize analysis services
  const projectOutlineGenerator = new ProjectOutlineGenerator(cacheManager, fileMetadataService, workspaceRoot);

  return {
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
          .sort(([,a], [,b]) => (b as number) - (a as number))
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
  };
}
