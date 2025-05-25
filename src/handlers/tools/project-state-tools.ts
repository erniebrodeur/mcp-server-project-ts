// Project state and change tracking tools

import { Tool } from "../../types/mcp.js";
import type { IChangeTracker, IFileUtils, ToolHandler } from "../../types/index.js";

export const projectStateTools: Tool[] = [
  {
    name: "get_project_status",
    description:
      "Get the current status of file changes and project dependencies. This tool provides a comprehensive overview of what has changed in the project since the last refresh, including version tracking and dependency information.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "refresh_changes",
    description:
      "Clear the changed files list and get information about what was cleared. Use this after processing all changed files to reset the tracking state. This increments the version counter and updates the last scan timestamp.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "has_file_changed",
    description:
      "Check which files have actually changed by comparing current content hashes with provided hashes. This is the core anti-duplication tool - agents can avoid re-reading files that haven't actually changed.",
    inputSchema: {
      type: "object",
      properties: {
        fileHashMap: {
          type: "object",
          description: "Object mapping file paths to their last-known content hashes",
          additionalProperties: {
            type: "string",
          },
        },
      },
      required: ["fileHashMap"],
      additionalProperties: false,
    },
  },
];

export function createProjectStateHandlers(
  changeTracker: IChangeTracker,
  fileUtils: IFileUtils,
  fileMetadataService: any,
  workspaceRoot: string
): Record<string, ToolHandler> {
  return {
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
          changedFiles: result.changedFiles.map((file: any) => ({
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
  };
}
