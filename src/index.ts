/**
 * MCP Server – TypeScript/JavaScript Project Change Tracker
 * ----------------------------------------------------------
 * A proper MCP-compliant server that provides:
 *  • File change tracking with notifications
 *  • Dependency management via npm
 *  • Structured tool descriptions for AI agents
 * 
 * Tools provided:
 *  - get_project_status    (get list of changed files and project info)
 *  - refresh_changes       (clear changed files list)
 *  - install_dependency    (npm install packages)
 *  - uninstall_dependency  (npm uninstall packages)
 *
 * NOTE: Server ONLY tracks which files changed - agents read files themselves.
 * No file content reading, no parsing, just change notifications.
 */

import { parseCliArgs, createServerConfig } from "./core/config.js";
import { createMcpServer, setupServerHandlers, startServer } from "./core/server.js";
import { FileWatcher } from "./tracking/file-watcher.js";
import { ChangeTracker } from "./tracking/change-tracker.js";
import { NpmManager } from "./dependencies/npm-manager.js";
import { FileUtils } from "./utils/file-utils.js";

async function main() {
  // Parse CLI arguments and setup configuration
  const { workspaceRoot } = parseCliArgs();
  const config = createServerConfig(workspaceRoot);

  console.error(`Watching workspace: ${workspaceRoot}`);

  // Initialize components
  const changeTracker = new ChangeTracker();
  const fileWatcher = new FileWatcher();
  const npmManager = new NpmManager(workspaceRoot);
  const fileUtils = new FileUtils();

  // Setup file watching
  fileWatcher.start(workspaceRoot, config);
  fileWatcher.on('change', (filePath) => {
    changeTracker.markDirty(filePath);
  });

  // Create and configure MCP server
  const server = createMcpServer();
  setupServerHandlers(server, changeTracker, npmManager, fileUtils, workspaceRoot);

  // Start the server
  await startServer(server);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});