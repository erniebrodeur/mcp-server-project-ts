/**
 * MCP-specific types and re-exports
 */

export { Server } from "@modelcontextprotocol/sdk/server/index.js";
export { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
export {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";
