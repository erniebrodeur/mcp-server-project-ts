/**
 * Unified tools index - combines all tool definitions and handlers
 */

import { Tool, ListToolsRequestSchema, CallToolRequestSchema } from "../../types/mcp.js";
import type { 
  IChangeTracker, 
  INpmManager, 
  IFileUtils, 
  ToolHandler, 
  IFileMetadataService, 
  ICacheManager, 
  ICacheMonitor 
} from "../../types/index.js";
import { FileSummaryGenerator } from "../../analysis/file-summary.js";

// Import all tool definitions
import { projectStateTools, createProjectStateHandlers } from "./project-state-tools.js";
import { packageTools, createPackageHandlers } from "./package-tools.js";
import { fileTools, createFileHandlers } from "./file-tools.js";
import { devOpsTools, createDevOpsHandlers } from "./dev-ops-tools.js";
import { analysisTools, createAnalysisHandlers } from "./analysis-tools.js";
import { cacheTools, createCacheHandlers } from "./cache-tools.js";

// Combine all tool definitions into unified array
export const tools: Tool[] = [
  ...projectStateTools,
  ...packageTools,
  ...fileTools,
  ...devOpsTools,
  ...analysisTools,
  ...cacheTools,
];

// Unified handler creation function
export function createToolHandlers(
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  workspaceRoot: string
): Record<string, ToolHandler> {
  // Initialize FileSummaryGenerator for file tools
  const fileSummaryGenerator = new FileSummaryGenerator(cacheManager, fileMetadataService, workspaceRoot);

  // Create handlers from each module
  const projectStateHandlers = createProjectStateHandlers(changeTracker, fileUtils, fileMetadataService, workspaceRoot);
  const packageHandlers = createPackageHandlers(npmManager);
  const fileHandlers = createFileHandlers(fileMetadataService, fileSummaryGenerator);
  const devOpsHandlers = createDevOpsHandlers(cacheManager, fileMetadataService, workspaceRoot);
  const analysisHandlers = createAnalysisHandlers(cacheManager, fileMetadataService, workspaceRoot);
  const cacheHandlers = createCacheHandlers(cacheManager, cacheMonitor, fileMetadataService, workspaceRoot);

  // Combine all handlers into single object
  return {
    ...projectStateHandlers,
    ...packageHandlers,
    ...fileHandlers,
    ...devOpsHandlers,
    ...analysisHandlers,
    ...cacheHandlers,
  };
}

// Registration function
export function registerToolHandlers(
  server: any,
  changeTracker: IChangeTracker,
  npmManager: INpmManager,
  fileUtils: IFileUtils,
  fileMetadataService: IFileMetadataService,
  cacheManager: ICacheManager,
  cacheMonitor: ICacheMonitor,
  workspaceRoot: string
): void {
  const handlers = createToolHandlers(
    changeTracker, 
    npmManager, 
    fileUtils, 
    fileMetadataService, 
    cacheManager, 
    cacheMonitor, 
    workspaceRoot
  );

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
