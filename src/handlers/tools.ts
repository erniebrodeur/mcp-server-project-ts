/**
 * Tool definitions and handlers
 */

import { Tool, ListToolsRequestSchema, CallToolRequestSchema } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils, ToolHandler, IFileMetadataService } from "../types/index.js";

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
];

export function createToolHandlers(
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  workspaceRoot: string
) {
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
  };

  return handlers;
}

export function registerToolHandlers(
  server: any,
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  workspaceRoot: string
): void {
  const handlers = createToolHandlers(changeTracker, npmManager, fileUtils, fileMetadataService, workspaceRoot);

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
