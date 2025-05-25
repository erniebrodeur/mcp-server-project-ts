/**
 * Resource definitions and handlers
 */

import path from "node:path";
import { Resource, ListResourcesRequestSchema, ReadResourceRequestSchema } from "../types/mcp.js";
import type { IFileUtils, ResourceHandler, ICachedResourceManager } from "../types/index.js";

export const resources: Resource[] = [
  {
    uri: "file://package.json",
    name: "Package Configuration",
    description: "The package.json file containing project metadata, dependencies, scripts, and configuration",
    mimeType: "application/json",
  },
  {
    uri: "file://tsconfig.json", 
    name: "TypeScript Configuration",
    description: "The tsconfig.json file containing TypeScript compiler options and project settings",
    mimeType: "application/json",
  },
  // Phase 5: Cache Resources
  {
    uri: "cache://typescript-errors",
    name: "Cached TypeScript Errors",
    description: "Cached TypeScript compilation results including errors and diagnostics",
    mimeType: "application/json",
  },
  {
    uri: "cache://lint-results",
    name: "Cached Lint Results", 
    description: "Cached ESLint results by file with issues and warnings",
    mimeType: "application/json",
  },
  {
    uri: "cache://test-results",
    name: "Cached Test Results",
    description: "Cached test suite results with pass/fail statistics",
    mimeType: "application/json",
  },
  // Phase 5: Metadata Resources
  {
    uri: "metadata://file-hashes",
    name: "File Content Hashes",
    description: "File content hashes for change detection without reading file contents",
    mimeType: "application/json",
  },
  {
    uri: "metadata://project-structure",
    name: "Project Structure",
    description: "Lightweight project tree view with file types and statistics",
    mimeType: "application/json",
  },
];

export function createResourceHandlers(
  fileUtils: IFileUtils,
  workspaceRoot: string,
  cachedResourceManager?: ICachedResourceManager
) {
  const handlers: Record<string, ResourceHandler> = {
    "file://package.json": async (uri: string) => {
      const pkgPath = path.join(workspaceRoot, "package.json");
      if (!fileUtils.fileExists(pkgPath)) {
        throw new Error("package.json not found in workspace");
      }
      const content = fileUtils.readTextFile(pkgPath);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    },

    "file://tsconfig.json": async (uri: string) => {
      const tsconfigPath = path.join(workspaceRoot, "tsconfig.json");
      if (!fileUtils.fileExists(tsconfigPath)) {
        throw new Error("tsconfig.json not found in workspace");
      }
      const content = fileUtils.readTextFile(tsconfigPath);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json", 
            text: content,
          },
        ],
      };
    },
  };

  // Phase 5: Add cache and metadata resource handlers
  if (cachedResourceManager) {
    // Cache resource handlers
    handlers["cache://typescript-errors"] = async (uri: string) => {
      const resource = await cachedResourceManager.generateCacheResource('typescript');
      if (!resource) {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No cached TypeScript results available" }, null, 2),
            },
          ],
        };
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              version: resource.version,
              lastUpdated: resource.lastUpdated,
              data: resource.data
            }, null, 2),
          },
        ],
      };
    };

    handlers["cache://lint-results"] = async (uri: string) => {
      const resource = await cachedResourceManager.generateCacheResource('lint');
      if (!resource) {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No cached lint results available" }, null, 2),
            },
          ],
        };
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              version: resource.version,
              lastUpdated: resource.lastUpdated,
              data: resource.data
            }, null, 2),
          },
        ],
      };
    };

    handlers["cache://test-results"] = async (uri: string) => {
      const resource = await cachedResourceManager.generateCacheResource('test');
      if (!resource) {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No cached test results available" }, null, 2),
            },
          ],
        };
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              version: resource.version,
              lastUpdated: resource.lastUpdated,
              data: resource.data
            }, null, 2),
          },
        ],
      };
    };

    // Metadata resource handlers
    handlers["metadata://file-hashes"] = async (uri: string) => {
      const resource = await cachedResourceManager.generateMetadataResource('file-hashes');
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              version: resource.version,
              lastUpdated: resource.lastUpdated,
              data: resource.data
            }, null, 2),
          },
        ],
      };
    };

    handlers["metadata://project-structure"] = async (uri: string) => {
      const resource = await cachedResourceManager.generateMetadataResource('project-structure');
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              version: resource.version,
              lastUpdated: resource.lastUpdated,
              data: resource.data
            }, null, 2),
          },
        ],
      };
    };
  }

  return handlers;
}

export function registerResourceHandlers(
  server: any,
  fileUtils: IFileUtils,
  workspaceRoot: string,
  cachedResourceManager?: ICachedResourceManager
): void {
  const handlers = createResourceHandlers(fileUtils, workspaceRoot, cachedResourceManager);

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    const { uri } = request.params;

    const handler = handlers[uri];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    return await handler(uri);
  });
}
