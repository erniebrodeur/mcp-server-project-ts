/**
 * MCP server setup and configuration
 */

import { Server, StdioServerTransport } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils, IFileMetadataService, ICacheManager, ICachedResourceManager, ICacheMonitor } from "../types/index.js";
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
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  workspaceRoot: string,
  cachedResourceManager: ICachedResourceManager
): void {
  registerToolHandlers(server, changeTracker, npmManager, fileUtils, fileMetadataService, cacheManager, cacheMonitor, workspaceRoot);
  registerResourceHandlers(server, fileUtils, workspaceRoot, cachedResourceManager);
}

export async function startServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
