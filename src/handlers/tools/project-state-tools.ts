// Project state and change tracking tools

import { Tool } from "../../types/mcp.js";
import type { IChangeTracker, IFileUtils, ToolHandler } from "../../types/index.js";

export const projectStateTools: Tool[] = [
  {
    name: "get_project_status",
    description:
      "Get the current status of file changes and project dependencies. This tool provides a comprehensive overview of what has changed in the project since the last refresh, including version tracking and dependency information.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "refresh_changes",
    description:
      "Clear the changed files list and get information about what was cleared. Use this after processing all changed files to reset the tracking state. This increments the version counter and updates the last scan timestamp.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "has_file_changed",
    description:
      "Check which files have actually changed by comparing current content hashes with provided hashes. This is the core anti-duplication tool - agents can avoid re-reading files that haven't actually changed.",
    inputSchema: {
      type: "object",
      properties: {
        fileHashMap: {
          type: "object",
          description: "Object mapping file paths to their last-known content hashes",
          additionalProperties: {
            type: "string",
          },
        },
      },
      required: ["fileHashMap"],
      additionalProperties: false,
    },
  },
];
