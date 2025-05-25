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
];
