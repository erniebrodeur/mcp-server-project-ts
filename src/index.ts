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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fsSync from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { execa } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// ----------------------------- CLI args ------------------------------------

const argv = yargs(hideBin(process.argv))
  .option("workspaceRoot", { type: "string", demandOption: true })
  .parseSync();

const workspaceRoot = path.resolve(argv.workspaceRoot);

// ----------------------- Change tracking state ------------------------------

let version = 1;
let lastScan = new Date();
const changedFiles = new Set<string>();

function markDirty(file: string) {
  changedFiles.add(file);
}

// ----------------------------- File watcher --------------------------------

const watcher = chokidar.watch(
  ["**/*.{ts,tsx,js,jsx}", "package.json", "package-lock.json", "pnpm-lock.yaml", "tsconfig.*"],
  {
    cwd: workspaceRoot,
    ignored: ["**/node_modules/**"],
    ignoreInitial: true,
  }
);

watcher.on("all", (_event, filePath) => {
  markDirty(filePath);
});

// --------------------------- Dependency management -------------------------

async function installDependency(packageName: string, isDev = false): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const args = ["install", packageName];
    if (isDev) {
      args.push("--save-dev");
    }
    
    const result = await execa("npm", args, { cwd: workspaceRoot });
    return { success: true, output: result.stdout };
  } catch (error: any) {
    return { success: false, output: error.stdout || "", error: error.stderr || error.message };
  }
}

async function uninstallDependency(packageName: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const result = await execa("npm", ["uninstall", packageName], { cwd: workspaceRoot });
    return { success: true, output: result.stdout };
  } catch (error: any) {
    return { success: false, output: error.stdout || "", error: error.stderr || error.message };
  }
}

function getDependencies() {
  try {
    const pkgFile = path.join(workspaceRoot, "package.json");
    if (!fsSync.existsSync(pkgFile)) return {};
    const pkg = JSON.parse(fsSync.readFileSync(pkgFile, "utf8"));
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}

// ----------------------- MCP Server Setup ---------------------------------

const server = new Server(
  {
    name: "project-change-tracker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ----------------------- Tool Definitions with Instructions ---------------

const tools: Tool[] = [
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
];

// ----------------------- Tool Handlers ------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_project_status": {
      const status = {
        dirty: changedFiles.size > 0,
        version,
        lastScan: lastScan.toISOString(),
        changedFiles: Array.from(changedFiles),
        dependencies: getDependencies(),
        workspaceRoot,
      };

      return {
        content: [
          {
            type: "text",
            text: `Project Status:
- Dirty: ${status.dirty}
- Version: ${status.version}
- Last Scan: ${status.lastScan}
- Changed Files (${status.changedFiles.length}): ${status.changedFiles.length > 0 ? '\n  ' + status.changedFiles.join('\n  ') : 'none'}
- Workspace: ${status.workspaceRoot}
- Dependencies: ${Object.keys(status.dependencies).length} packages installed`,
          },
        ],
      };
    }

    case "refresh_changes": {
      const result = {
        changedFiles: Array.from(changedFiles),
        cleared: changedFiles.size,
        previousVersion: version,
      };

      // Clear the changed files list - agent will read them itself
      changedFiles.clear();
      version++;
      lastScan = new Date();

      return {
        content: [
          {
            type: "text",
            text: `Changes refreshed:
- Cleared ${result.cleared} changed files
- Previous version: ${result.previousVersion}
- New version: ${version}
- Files that were cleared: ${result.changedFiles.length > 0 ? '\n  ' + result.changedFiles.join('\n  ') : 'none'}`,
          },
        ],
      };
    }

    case "install_dependency": {
      const { packageName, isDev } = args as { packageName: string; isDev?: boolean };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await installDependency(packageName, Boolean(isDev));
      
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
    }

    case "uninstall_dependency": {
      const { packageName } = args as { packageName: string };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await uninstallDependency(packageName);
      
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
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ----------------------- Server Startup ----------------------------------

async function main() {
  console.error("MCP Project Change Tracker starting...");
  console.error(`Watching workspace: ${workspaceRoot}`);
  console.error("Server will ONLY track file changes - no content reading");
  console.error("Tools available: get_project_status, refresh_changes, install_dependency, uninstall_dependency");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MCP Server connected and ready!");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});