/**
 * MCP Server – minimal functional prototype
 * -----------------------------------------
 *  • Initial project scan with ts‑morph
 *  • SQLite persistence (schema auto‑applied)
 *  • File‑watch dirty tracking
 *  • JSON‑RPC 2.0 over WebSocket:
 *      - index.status
 *      - index.refresh
 *
 * NOTE: this is still a prototype; search.query, snippet.fetch, etc. are
 * placeholders but the core index workflow is operational.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import Database from "better-sqlite3";
import { Project, ExportedDeclarations } from "ts-morph";
import { WebSocketServer } from "ws";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { fileURLToPath } from "node:url";

// ----------------------------- CLI args ------------------------------------

const argv = yargs(hideBin(process.argv))
  .option("workspaceRoot", { type: "string", demandOption: true })
  .option("port", { type: "number", default: 31337 })
  .parseSync();

const workspaceRoot = path.resolve(argv.workspaceRoot);
const schemaFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../schema.sql");

// ----------------------------- Database ------------------------------------

const dbPath = path.join(workspaceRoot, ".mcp_index.sqlite");
const db = new Database(dbPath);
applySchema();

// convenience helpers
const prepare = db.prepare.bind(db);
function applySchema() {
  const sql = fs.readFileSync(schemaFile, "utf8");
  db.exec(sql);
  prepare(`INSERT OR IGNORE INTO metadata(key,value) VALUES ('version','1'), ('dirty','0'), ('lastScan', datetime('now'))`).run();
}

// ----------------------- Dirty tracking state ------------------------------

let dirty = false;
const changedFiles = new Set<string>();

function markDirty(file: string) {
  dirty = true;
  changedFiles.add(file);
  prepare(`UPDATE metadata SET value='1' WHERE key='dirty'`).run();
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

// --------------------------- Project scanning ------------------------------

function scanProject({ incremental = false } = {}): string[] {
  const project = new Project({
    tsConfigFilePath: path.join(workspaceRoot, "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  const updated: string[] = [];

  const insertModule = prepare(
    `INSERT OR REPLACE INTO modules(path,summary) VALUES (@path,@summary)`
  );
  const deleteExports = prepare(`DELETE FROM exports WHERE module_id=(SELECT id FROM modules WHERE path = ?)`);
  const insertExport = prepare(
    `INSERT INTO exports(module_id,name,kind,summary)
       VALUES ((SELECT id FROM modules WHERE path=@path LIMIT 1), @name, @kind, @summary)`
  );

  for (const source of project.getSourceFiles()) {
    const relPath = path.relative(workspaceRoot, source.getFilePath());
    if (!relPath || relPath.startsWith("node_modules")) continue;
    if (incremental && !changedFiles.has(relPath)) continue;

    const firstLine = (source.getLeadingCommentRanges()[0]?.getText() || "")
      .split("\n")[0]
      .replace(/\/\*\*?/, "")
      .trim();

    insertModule.run({ path: relPath, summary: firstLine });
    deleteExports.run(relPath);

    const exported = source.getExportedDeclarations();
    for (const [name, decls] of exported) {
      const kind = decls[0].getKindName();
      insertExport.run({ path: relPath, name, kind, summary: "" });
    }
    updated.push(relPath);
  }

  // dependencies
  if (!incremental || [...changedFiles].some((f) => f.match(/package(-lock)?\.json|pnpm-lock\.yaml|package\.json/))) {
    indexDependencies();
  }

  return updated;
}

function indexDependencies() {
  const pkgFile = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(pkgFile)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const insertDep = prepare(
    `INSERT OR REPLACE INTO deps(name,version,homepage,repository,docs)
       VALUES (@name,@version,@homepage,@repository,@docs)`
  );

  for (const [name, version] of Object.entries(deps)) {
    try {
      const depPkgPath = path.join(workspaceRoot, "node_modules", name, "package.json");
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf8"));
      insertDep.run({
        name,
        version: depPkg.version ?? version,
        homepage: depPkg.homepage ?? null,
        repository: depPkg.repository?.url ?? null,
        docs: depPkg.bugs?.url ?? null,
      });
    } catch {
      // ignore missing packages
    }
  }
}

// ----------------------- Initial full scan ---------------------------------

console.log("Running initial scan…");
const initialFiles = scanProject();
dirty = false;
changedFiles.clear();
prepare(`UPDATE metadata SET value='0' WHERE key='dirty'`).run();
prepare(`UPDATE metadata SET value=datetime('now') WHERE key='lastScan'`).run();
console.log(`Indexed ${initialFiles.length} source files`);

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
  socket.on("message", (data) => {
    try {
      const req: JsonRpcRequest = JSON.parse(data.toString());
      switch (req.method) {
        case "index.status": {
          const status = {
            dirty,
            version: Number((prepare(`SELECT value FROM metadata WHERE key='version'`).get() as any)?.value),
            lastScan: (prepare(`SELECT value FROM metadata WHERE key='lastScan'`).get() as any)?.value,
            changedFiles: dirty ? [...changedFiles] : undefined,
          };
          socket.send(JSON.stringify(makeResponse(req.id, status)));
          break;
        }
        case "index.refresh": {
          if (!dirty) {
            socket.send(JSON.stringify(makeResponse(req.id, { updated: [] })));
            break;
          }
          const updated = scanProject({ incremental: true });
          changedFiles.clear();
          dirty = false;
          prepare("UPDATE metadata SET value='0' WHERE key='dirty'").run();
          prepare("UPDATE metadata SET value=value+1 WHERE key='version'").run();
          prepare("UPDATE metadata SET value=datetime('now') WHERE key='lastScan'").run();
          socket.send(JSON.stringify(makeResponse(req.id, { updated })));
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