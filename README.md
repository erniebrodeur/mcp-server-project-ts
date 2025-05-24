# MCP Project Change Tracker

A **Model Context Protocol (MCP) compliant server** for TypeScript/JavaScript project change tracking and dependency management.

## Overview

This MCP server provides AI agents with structured tools to:
- Track file changes in TypeScript/JavaScript projects
- Manage npm dependencies
- Get project status information
- Clear change tracking state

**Key Design Principle**: The server only tracks *which* files have changed, not their content. Agents are expected to read file contents themselves when needed.

## MCP Tools Provided

### 1. `get_project_status`
**Description**: Get comprehensive project status including changed files and dependencies.

**Usage**: 
```json
{
  "name": "get_project_status",
  "arguments": {}
}
```

**Returns**: Information about:
- Whether there are dirty/changed files
- Current version number 
- Last scan timestamp
- List of changed file paths
- Installed dependencies
- Workspace root path

### 2. `refresh_changes`
**Description**: Clear the changed files list and get information about what was cleared.

**Usage**:
```json
{
  "name": "refresh_changes", 
  "arguments": {}
}
```

**Returns**: Details about cleared files and version increment.

### 3. `install_dependency`
**Description**: Install npm packages with proper dependency classification.

**Parameters**:
- `packageName` (required): Name of the npm package
- `isDev` (optional): Install as dev dependency (default: false)

**Usage**:
```json
{
  "name": "install_dependency",
  "arguments": {
    "packageName": "lodash",
    "isDev": false
  }
}
```

### 4. `uninstall_dependency`
**Description**: Remove npm packages from the project.

**Parameters**:
- `packageName` (required): Name of the package to remove

**Usage**:
```json
{
  "name": "uninstall_dependency",
  "arguments": {
    "packageName": "lodash"
  }
}
```

## What It Doesn't Do ❌

This is a **change notification server** - it does NOT:
- Read source file content (agents do this themselves)
- Parse TypeScript/JavaScript AST 
- Store file content or parsed data
- Provide code completion or IntelliSense
- Pre-process or analyze code structure
- Search functionality

## Installation & Setup

### Prerequisites
- Node.js 20+
- npm or pnpm
- A TypeScript/JavaScript project with `tsconfig.json`

### Quick Start
```bash
# Clone or download this MCP server
git clone <this-repo> mcp-server

# Install dependencies
cd mcp-server
npm install

# Build the server
npm run build

# Start the server (pointing to your project)
npm start -- --workspaceRoot /path/to/your/project --port 31337
```

### Development Mode
```bash
# Watch mode for development
npm run watch -- --workspaceRoot /path/to/your/project
```

## Usage

## Usage

### Command Line
```bash
# Build the server
npm run build

# Start the server (pointing to your project)
npm start -- --workspaceRoot /path/to/your/project --port 31337
```

### Development Mode
```bash
# Watch mode for development
npm run watch -- --workspaceRoot /path/to/your/project
```

## JSON-RPC API Examples

Connect to `ws://localhost:31337` and send JSON-RPC 2.0 messages:

#### Check What Files Changed
```json
{
  "id": 1,
  "method": "index.status"
}
```

Response:
```json
{
  "id": 1,
  "result": {
    "dirty": true,
    "version": 5,
    "lastScan": "2025-05-24T10:30:00.000Z",
    "changedFiles": ["src/app.ts", "src/utils.ts"],
    "dependencies": { "react": "^18.0.0", "typescript": "^5.0.0" }
  }
}
```

#### Clear Changed Files List
```json
{
  "id": 2,
  "method": "index.refresh"
}
```

Response:
```json
{
  "id": 2,
  "result": {
    "changedFiles": ["src/app.ts", "src/utils.ts"],
    "cleared": 2
  }
}
```

After this call, the agent reads `src/app.ts` and `src/utils.ts` itself using its own file system access.

#### Install/Uninstall Dependencies
```json
{
  "id": 3,
  "method": "deps.install",
  "params": {
    "packageName": "lodash",
    "isDev": false
  }
}
```

## Installation & Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage with MCP Clients

### As MCP Server (Recommended)

The server uses **stdio transport** as per MCP specification:

```bash
# Run the server with required workspace parameter
node dist/index.js --workspaceRoot /path/to/your/project
```

### Integration Examples

**With MCP-compatible AI applications** (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "project-tracker": {
      "command": "node",
      "args": ["/path/to/dist/index.js", "--workspaceRoot", "/path/to/project"]
    }
  }
}
```

**With OpenAI Agents SDK**:
```python
from openai_agents_python.mcp import MCPServerStdio

async with MCPServerStdio(
    params={
        "command": "node",
        "args": ["/path/to/dist/index.js", "--workspaceRoot", "/path/to/project"],
    }
) as server:
    tools = await server.list_tools()
    # Use tools in your agent
```

## File Watching

The server automatically watches for changes in:
- `**/*.{ts,tsx,js,jsx}` - TypeScript/JavaScript source files
- `package.json` - Main package configuration
- `package-lock.json` - npm lock file  
- `pnpm-lock.yaml` - pnpm lock file
- `tsconfig.*` - TypeScript configuration files

**Excluded**: `node_modules` directories

## Architecture

This is a **proper MCP server** that follows the Model Context Protocol specification:

- **Transport**: stdio (standard input/output)
- **Protocol**: JSON-RPC 2.0 as defined by MCP
- **Capabilities**: Tools with structured schemas and descriptions
- **Discoverability**: Tools are self-describing with input schemas

## Development

```bash
# Development mode with auto-restart
npm run dev -- --workspaceRoot .

# Build for production
npm run build

# Test the server
node test-mcp-client.js
```

## Benefits of MCP Compliance

1. **Standardization**: Works with any MCP-compatible client
2. **Discoverability**: Tools are self-describing with schemas
3. **Type Safety**: Input validation via JSON schemas
4. **Instructions**: Built-in documentation for AI agents
5. **Interoperability**: Part of the growing MCP ecosystem

## Comparison to WebSocket Version

The previous WebSocket implementation provided similar functionality but lacked:
- Standardized tool discovery
- Input validation schemas  
- Structured tool descriptions
- MCP ecosystem compatibility
- Built-in agent instructions

This MCP version provides the same core functionality with much better AI agent integration.