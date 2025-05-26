/**
 * MCP server setup and configuration
 */

import { Server, StdioServerTransport } from "../types/mcp.js";
import type { IChangeTracker, INpmManager, IFileUtils, IFileMetadataService, ICacheManager, ICachedResourceManager, ICacheMonitor } from "../types/index.js";
import { registerToolHandlers } from "../handlers/tools.js";
import { registerResourceHandlers } from "../handlers/resources.js";
import { registerPromptHandlers } from "../handlers/prompts.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

export function createMcpServer(): Server {
  return new Server(
    {
      name: "mcp-server-project-ts",
      version: packageJson.version,
      description: "Comprehensive TypeScript/JavaScript project management server providing file change tracking, NPM dependency management, intelligent caching for dev operations (TypeScript/lint/test), project analysis tools, and resource-based access to cached metadata. Designed for AI agents to efficiently understand and manage JavaScript/TypeScript codebases without reading file contents directly."
    },
    {
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          listChanged: true,
          subscribe: true
        },
        prompts: {
          listChanged: true
        },
        logging: {}
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
  registerPromptHandlers(server);
}

export async function startServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
