/**
 * MCP server setup and configuration
 */

import { Server, StdioServerTransport } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils } from "../types/index.js";
import { registerToolHandlers } from "../handlers/tools.js";
import { registerResourceHandlers } from "../handlers/resources.js";

export function createMcpServer(): Server {
  return new Server(
    {
      name: "project-change-tracker",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );
}

export function setupServerHandlers(
  server: Server,
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  workspaceRoot: string
): void {
  registerToolHandlers(server, changeTracker, npmManager, fileUtils, workspaceRoot);
  registerResourceHandlers(server, fileUtils, workspaceRoot);
}

export async function startServer(server: Server): Promise<void> {
  console.error("MCP Project Change Tracker starting...");
  console.error("Server will ONLY track file changes - no content reading");
  console.error("Tools available: get_project_status, refresh_changes, install_dependency, uninstall_dependency");
  console.error("Resources available: package.json, tsconfig.json");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MCP Server connected and ready!");
}
