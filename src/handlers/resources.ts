/**
 * Resource definitions and handlers
 */

import path from "node:path";
import { Resource, ListResourcesRequestSchema, ReadResourceRequestSchema } from "../types/mcp.js";
import type { IFileUtils, ResourceHandler } from "../types/index.js";

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
];

export function createResourceHandlers(
  fileUtils: IFileUtils,
  workspaceRoot: string
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

  return handlers;
}

export function registerResourceHandlers(
  server: any,
  fileUtils: IFileUtils,
  workspaceRoot: string
): void {
  const handlers = createResourceHandlers(fileUtils, workspaceRoot);

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
