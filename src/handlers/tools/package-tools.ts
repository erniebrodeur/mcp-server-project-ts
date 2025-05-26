// NPM package management tools

import { Tool } from "../../types/mcp.js";
import type { INpmManager, ToolHandler } from "../../types/index.js";

export const packageTools: Tool[] = [
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
  {
    name: "update_dependency",
    description: "Update an npm package to the latest compatible version. This tool runs 'npm update' with the specified package name.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: {
          type: "string",
          description: "The name of the npm package to update",
        },
      },
      required: ["packageName"],
      additionalProperties: false,
    },
  },
  {
    name: "check_outdated",
    description: "Check for outdated packages in the project. This tool runs 'npm outdated --json' to list packages with newer versions available.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "run_npm_script",
    description: "Execute a script defined in package.json. This tool runs 'npm run' with the specified script name.",
    inputSchema: {
      type: "object",
      properties: {
        scriptName: {
          type: "string",
          description: "The name of the script to run (must be defined in package.json scripts)",
        },
      },
      required: ["scriptName"],
      additionalProperties: false,
    },
  },
  {
    name: "list_scripts",
    description: "List all available npm scripts defined in package.json. Shows script names and their commands.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "npm_audit",
    description: "Run npm audit to check for security vulnerabilities in dependencies. This tool runs 'npm audit --json' to analyze the project for known security issues.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

export function createPackageHandlers(
  npmManager: INpmManager
): Record<string, ToolHandler> {
  return {
    install_dependency: async (args: any) => {
      const { packageName, isDev } = args as { packageName: string; isDev?: boolean };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await npmManager.install(packageName, Boolean(isDev));
      
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
    },

    uninstall_dependency: async (args: any) => {
      const { packageName } = args as { packageName: string };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await npmManager.uninstall(packageName);
      
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
    },

    update_dependency: async (args: any) => {
      const { packageName } = args as { packageName: string };
      
      if (!packageName || typeof packageName !== "string") {
        throw new Error("packageName is required and must be a string");
      }

      const result = await npmManager.update(packageName);
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Successfully updated ${packageName}:\n${result.output}`
              : `Failed to update ${packageName}:\n${result.error || result.output}`,
          },
        ],
      };
    },

    check_outdated: async () => {
      const result = await npmManager.checkOutdated();
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Outdated packages check:\n${result.output}`
              : `Failed to check outdated packages:\n${result.error || result.output}`,
          },
        ],
      };
    },

    run_npm_script: async (args: any) => {
      const { scriptName } = args as { scriptName: string };
      
      if (!scriptName || typeof scriptName !== "string") {
        throw new Error("scriptName is required and must be a string");
      }

      const result = await npmManager.runScript(scriptName);
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Successfully ran script '${scriptName}':\n${result.output}`
              : `Failed to run script '${scriptName}':\n${result.error || result.output}`,
          },
        ],
      };
    },

    list_scripts: async () => {
      const result = await npmManager.listScripts();
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? result.output
              : `Failed to list scripts:\n${result.error || result.output}`,
          },
        ],
      };
    },

    npm_audit: async () => {
      const result = await npmManager.audit();
      
      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `Security audit results:\n${result.output}`
              : `Failed to run security audit:\n${result.error || result.output}`,
          },
        ],
      };
    },
  };
}
