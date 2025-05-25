/**
 * NPM package management operations
 */

import { execa } from "execa";
import type { INpmManager, DependencyOperation } from "../types/index.js";

export class NpmManager implements INpmManager {
  constructor(private workspaceRoot: string) {}

  async install(packageName: string, isDev = false): Promise<DependencyOperation> {
    try {
      const args = ["install", packageName];
      if (isDev) {
        args.push("--save-dev");
      }
      
      const result = await execa("npm", args, { cwd: this.workspaceRoot });
      return { success: true, output: result.stdout };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.stdout || "", 
        error: error.stderr || error.message 
      };
    }
  }

  async uninstall(packageName: string): Promise<DependencyOperation> {
    try {
      const result = await execa("npm", ["uninstall", packageName], { 
        cwd: this.workspaceRoot 
      });
      return { success: true, output: result.stdout };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.stdout || "", 
        error: error.stderr || error.message 
      };
    }
  }
}
