# MCP Server Examples

This document provides detailed examples of using the MCP Project Change Tracker server.

## MCP Tools Reference

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

### 5. `update_dependency`
**Description**: Update a specific npm package to the latest compatible version.

**Parameters**:
- `packageName` (required): Name of the package to update

**Usage**:
```json
{
  "name": "update_dependency",
  "arguments": {
    "packageName": "lodash"
  }
}
```

### 6. `check_outdated`
**Description**: Check for outdated packages in the project. Lists all packages with newer versions available.

**Usage**:
```json
{
  "name": "check_outdated",
  "arguments": {}
}
```

**Returns**: JSON formatted list of outdated packages with current, wanted, and latest versions.

### 7. `run_npm_script`
**Description**: Execute a script defined in package.json. Provides real-time output from script execution.

**Parameters**:
- `scriptName` (required): Name of the script to run (must be defined in package.json scripts)

**Usage**:
```json
{
  "name": "run_npm_script",
  "arguments": {
    "scriptName": "build"
  }
}
```

### 8. `list_scripts`
**Description**: List all available npm scripts defined in package.json with their commands.

**Usage**:
```json
{
  "name": "list_scripts",
  "arguments": {}
}
```

**Returns**: Formatted list of script names and their commands.

### 9. `npm_audit`
**Description**: Run npm audit to check for security vulnerabilities in dependencies.

**Usage**:
```json
{
  "name": "npm_audit",
  "arguments": {}
}
```

**Returns**: JSON formatted security audit results with vulnerability details and metadata.

## JSON-RPC API Examples

Connect to `ws://localhost:31337` and send JSON-RPC 2.0 messages:

### Check What Files Changed
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

### Clear Changed Files List
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

### Install/Uninstall Dependencies
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

## Integration Examples

### With MCP-compatible AI applications
Configure in Claude Desktop, Cursor, etc.:

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

### With OpenAI Agents SDK
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

## What It Doesn't Do ❌

This is a **change notification server** - it does NOT:
- Read source file content (agents do this themselves)
- Parse TypeScript/JavaScript AST 
- Store file content or parsed data
- Provide code completion or IntelliSense
- Pre-process or analyze code structure
- Search functionality
