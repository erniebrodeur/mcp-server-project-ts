/**
 * File system utilities
 */

import fsSync from "node:fs";
import path from "node:path";
import type { IFileUtils } from "../types/index.js";

export class FileUtils implements IFileUtils {
  getDependencies(workspaceRoot: string): Record<string, string> {
    try {
      const pkgFile = path.join(workspaceRoot, "package.json");
      if (!fsSync.existsSync(pkgFile)) return {};
      const pkg = JSON.parse(fsSync.readFileSync(pkgFile, "utf8"));
      return { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      return {};
    }
  }

  fileExists(filePath: string): boolean {
    return fsSync.existsSync(filePath);
  }

  readJsonFile(filePath: string): any {
    try {
      return JSON.parse(fsSync.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
    }
  }

  readTextFile(filePath: string): string {
    try {
      return fsSync.readFileSync(filePath, "utf8");
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }
}
