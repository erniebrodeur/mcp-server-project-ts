/**
 * Configuration management for the MCP server
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "node:path";
import type { ServerConfig } from "../types/index.js";

export function parseCliArgs(): { workspaceRoot: string } {
  const argv = yargs(hideBin(process.argv))
    .option("workspaceRoot", { type: "string", demandOption: true })
    .parseSync();

  return {
    workspaceRoot: path.resolve(argv.workspaceRoot),
  };
}

export function createServerConfig(workspaceRoot: string): ServerConfig {
  return {
    workspaceRoot,
    watchPatterns: [
      "**/*.{ts,tsx,js,jsx}",
      "package.json",
      "package-lock.json", 
      "pnpm-lock.yaml",
      "tsconfig.*"
    ],
    ignoredPatterns: ["**/node_modules/**"],
  };
}
