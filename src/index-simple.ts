/**
 * MCP Server – TypeScript/JavaScript Project Change Detector
 * ----------------------------------------------------------
 *  • File‑watch dirty tracking
 *  • Dependency management via npm
 *  • JSON‑RPC 2.0 over WebSocket:
 *      - index.status     (get dirty files list)
 *      - index.refresh    (get content of changed files)
 *      - deps.install     (npm install packages)
 *      - deps.uninstall   (npm uninstall packages)
 *
 * NOTE: Agents read only changed files and do their own parsing.
 * No AST parsing, no SQLite - just efficient change detection.
 */

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { execa } from "execa";
import { WebSocketServer } from "ws";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// ----------------------------- CLI args ------------------------------------

const argv = yargs(hideBin(process.argv))
  .option("workspaceRoot", { type: "string", demandOption: true })
  .option("port", { type: "number", default: 31337 })
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

// --------------------------- File content reading --------------------------

async function getFileContent(filePath: string): Promise<{ path: string; content: string } | null> {
  try {
    const fullPath = path.join(workspaceRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    return { path: filePath, content };
  } catch {
    return null;
  }
}

async function getChangedFilesContent(): Promise<Array<{ path: string; content: string }>> {
  const results = await Promise.all(
    Array.from(changedFiles).map(getFileContent)
  );
  return results.filter((result): result is { path: string; content: string } => result !== null);
}

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

// ----------------------- Initial state ---------------------------------

console.log("MCP Server starting...");
console.log(`Watching workspace: ${workspaceRoot}`);

// --------------------------- JSON-RPC server -------------------------------

type JsonRpcRequest = { id: number; method: string; params?: any };
type JsonRpcResponse = { id: number; result?: any; error?: { code: number; message: string } };

function makeResponse(id: number, result: any): JsonRpcResponse {
  return { id, result };
}
function makeError(id: number, code: number, msg: string): JsonRpcResponse {
  return { id, error: { code, message: msg } };
}

const wss = new WebSocketServer({ port: argv.port });
wss.on("connection", (socket) => {
  socket.on("message", async (data) => {
    try {
      const req: JsonRpcRequest = JSON.parse(data.toString());
      switch (req.method) {
        case "index.status": {
          const status = {
            dirty: changedFiles.size > 0,
            version,
            lastScan: lastScan.toISOString(),
            changedFiles: Array.from(changedFiles),
            dependencies: getDependencies()
          };
          socket.send(JSON.stringify(makeResponse(req.id, status)));
          break;
        }
        case "index.refresh": {
          if (changedFiles.size === 0) {
            socket.send(JSON.stringify(makeResponse(req.id, { files: [] })));
            break;
          }
          
          const files = await getChangedFilesContent();
          changedFiles.clear();
          version++;
          lastScan = new Date();
          
          socket.send(JSON.stringify(makeResponse(req.id, { files })));
          break;
        }
        case "deps.install": {
          const { packageName, isDev } = req.params || {};
          if (!packageName || typeof packageName !== "string") {
            socket.send(JSON.stringify(makeError(req.id, -32602, "Invalid params: packageName required")));
            break;
          }
          try {
            const result = await installDependency(packageName, Boolean(isDev));
            socket.send(JSON.stringify(makeResponse(req.id, result)));
          } catch (err: any) {
            socket.send(JSON.stringify(makeError(req.id, -32603, "Internal error: " + err.message)));
          }
          break;
        }
        case "deps.uninstall": {
          const { packageName } = req.params || {};
          if (!packageName || typeof packageName !== "string") {
            socket.send(JSON.stringify(makeError(req.id, -32602, "Invalid params: packageName required")));
            break;
          }
          try {
            const result = await uninstallDependency(packageName);
            socket.send(JSON.stringify(makeResponse(req.id, result)));
          } catch (err: any) {
            socket.send(JSON.stringify(makeError(req.id, -32603, "Internal error: " + err.message)));
          }
          break;
        }
        default:
          socket.send(JSON.stringify(makeError(req.id, -32601, "Method not found")));
      }
    } catch (err: any) {
      socket.send(
        JSON.stringify({ id: null, error: { code: -32700, message: "Parse error: " + err.message } })
      );
    }
  });
});

console.log(`MCP Server listening on ws://localhost:${argv.port}`);
console.log("Ready to track file changes and serve content to agents.");
