# MCP Server for TypeScript/JavaScript Projects

A **Model Context Protocol (MCP)** server that provides ultra-minimal file change tracking for TypeScript and JavaScript workspaces. This server enables LLM agents to know which files changed without any file content reading or processing.

## What It Does ✅

### Core Functionality
- **📂 File Watching**: Monitors TypeScript/JavaScript files for changes using `chokidar`
- **📝 Change Tracking**: Maintains a simple list of changed file paths
- **📦 Dependency Management**: Install/uninstall npm packages via JSON-RPC
- **🔌 JSON-RPC API**: WebSocket server providing change notifications

### Ultra-Efficient Agent Workflow
1. **Agent connects** → calls `index.status` to see which files changed
2. **Gets file paths only** → no file content served by server
3. **Agent reads files itself** → using its own file system access
4. **Agent clears change list** → calls `index.refresh` to reset tracking
5. **Minimal overhead** → server only tracks changes, doesn't read source files

### Available JSON-RPC Methods
- `index.status` - Get list of changed file paths (no content)
- `index.refresh` - Clear the changed files list and return what was changed
- `deps.install` - Install npm packages (with dev dependency support)
- `deps.uninstall` - Remove npm packages

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

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Your Project  │───▶│  MCP Server  │───▶│    Agent    │
│  (TypeScript/   │    │              │    │             │
│   JavaScript)   │    │ • chokidar   │    │ Reads files │
└─────────────────┘    │ • WebSocket  │    │ itself via  │
         │              │ • Change     │    │ filesystem  │
         │              │   tracking   │    │ access      │
         ▼              └──────────────┘    └─────────────┘
   File changes              │
   detected by              ▼
   chokidar            Change notifications
                       (file paths only)
```

### Key Principles
- **Minimal overhead**: Server only tracks which files changed
- **No file reading**: Agents read files themselves when needed
- **Change notifications**: Server tells agents what to read
- **Dependency management**: Server can install/uninstall packages

## Integration with LLM Agents

This server is designed to work with LLM-powered coding agents that need efficient access to project structure. Instead of agents repeatedly reading and parsing files, they can:

1. Check `index.status` to see if data is current
2. Call `index.refresh` if files have changed  
3. Query the SQLite database directly for project information
4. Install/remove dependencies as needed during development

## Roadmap

Future enhancements may include:
- `search.query` - Semantic code search across the project
- `snippet.fetch` - Extract and return specific code snippets
- `symbol.find` - Locate symbol definitions and references
- `docs.generate` - Generate documentation from code

## Contributing

This server provides a solid foundation for LLM-assisted development tools. The modular design makes it easy to extend with additional indexing capabilities or JSON-RPC methods.

## License

MIT License - see LICENSE file for details.