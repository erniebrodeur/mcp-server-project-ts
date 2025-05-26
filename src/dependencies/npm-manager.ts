/**
 * NPM package management operations
 */

import { execa } from "execa";
import path from "node:path";
import type { INpmManager, DependencyOperation } from "../types/index.js";
import { FileUtils } from "../utils/file-utils.js";

export class NpmManager implements INpmManager {
  private fileUtils: FileUtils;
  
  constructor(private workspaceRoot: string) {
    this.fileUtils = new FileUtils();
  }

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

  async update(packageName: string): Promise<DependencyOperation> {
    try {
      const result = await execa("npm", ["update", packageName], { 
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

  async checkOutdated(): Promise<DependencyOperation> {
    try {
      const result = await execa("npm", ["outdated", "--json"], { 
        cwd: this.workspaceRoot 
      });
      return { success: true, output: result.stdout };
    } catch (error: any) {
      // npm outdated returns exit code 1 when outdated packages are found
      // This is not an error, just means there are outdated packages
      if (error.exitCode === 1 && error.stdout) {
        return { success: true, output: error.stdout };
      }
      return { 
        success: false, 
        output: error.stdout || "", 
        error: error.stderr || error.message 
      };
    }
  }

  async runScript(scriptName: string): Promise<DependencyOperation> {
    try {
      const result = await execa("npm", ["run", scriptName], { 
        cwd: this.workspaceRoot,
        all: true // Combine stdout and stderr for better streaming output
      });
      return { success: true, output: result.all || result.stdout };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.all || error.stdout || "", 
        error: error.stderr || error.message 
      };
    }
  }

  async listScripts(): Promise<DependencyOperation> {
    try {
      const packageJsonPath = path.join(this.workspaceRoot, "package.json");
      
      if (!this.fileUtils.fileExists(packageJsonPath)) {
        return { 
          success: false, 
          output: "", 
          error: "No package.json found in workspace" 
        };
      }

      const packageJson = this.fileUtils.readJsonFile(packageJsonPath);
      const scripts = packageJson.scripts || {};
      
      if (Object.keys(scripts).length === 0) {
        return { success: true, output: "No scripts defined in package.json" };
      }

      const scriptList = Object.entries(scripts)
        .map(([name, command]) => `${name}: ${command}`)
        .join('\n');
      
      return { success: true, output: `Available scripts:\n${scriptList}` };
    } catch (error: any) {
      return { 
        success: false, 
        output: "", 
        error: error.message 
      };
    }
  }

  async audit(): Promise<DependencyOperation> {
    try {
      const result = await execa("npm", ["audit", "--json"], { 
        cwd: this.workspaceRoot 
      });
      return { success: true, output: result.stdout };
    } catch (error: any) {
      // npm audit returns exit code 1 when vulnerabilities are found
      // This is not an error, just means there are vulnerabilities
      if (error.exitCode === 1 && error.stdout) {
        return { success: true, output: error.stdout };
      }
      return { 
        success: false, 
        output: error.stdout || "", 
        error: error.stderr || error.message 
      };
    }
  }
}
