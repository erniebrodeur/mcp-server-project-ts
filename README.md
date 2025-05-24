# MCP Server for TypeScript/JavaScript Projects

A **Model Context Protocol (MCP)** server that provides efficient file change detection for TypeScript and JavaScript workspaces. This server enables LLM agents to understand when files have changed and get only the updated content, avoiding expensive re-reads of entire codebases.

## What It Does ✅

### Core Functionality
- **📂 File Watching**: Monitors TypeScript/JavaScript files for changes using `chokidar`
- **⚡ Change Detection**: Tracks which files are dirty vs. clean to avoid unnecessary reads
- **📄 Content Serving**: Returns actual file content for changed files only
- **📦 Dependency Management**: Install/uninstall npm packages via JSON-RPC
- **🔌 JSON-RPC API**: WebSocket server providing programmatic access to change status

### Efficient Agent Workflow
1. **Agent connects** → checks `index.status` to see if any files changed
2. **If changes detected** → calls `index.refresh` to get content of only changed files
3. **Agent parses content itself** → no pre-processing, just raw file content
4. **Massive performance improvement** → no re-reading entire codebase every time

### Available JSON-RPC Methods
- `index.status` - Get current dirty files list and project state
- `index.refresh` - Get content of all changed files since last refresh
- `deps.install` - Install npm packages (with dev dependency support)
- `deps.uninstall` - Remove npm packages

## What It Doesn't Do ❌

This is a **change detection server**, not a parser or language server. It does not:
- Parse TypeScript/JavaScript AST (agents do this themselves)
- Provide code completion or IntelliSense
- Store parsed data in databases (agents maintain their own state)
- Pre-process or analyze code structure
- Provide search functionality (agents read files and search themselves)

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

### Command Line Options
```bash
node dist/index.js --workspaceRoot <path> [--port <number>]
```

- `--workspaceRoot` (required): Absolute path to your TypeScript/JavaScript project
- `--port` (optional): WebSocket port number (default: 31337)

### JSON-RPC API Examples

Connect to `ws://localhost:31337` and send JSON-RPC 2.0 messages:

#### Check Index Status
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
    "dirty": false,
    "version": 3,
    "lastScan": "2025-05-24 10:30:00",
    "changedFiles": []
  }
}
```

#### Refresh Changed Files
```json
{
  "id": 2,
  "method": "index.refresh"
}
```

#### Install Dependencies
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

#### Uninstall Dependencies
```json
{
  "id": 4,
  "method": "deps.uninstall", 
  "params": {
    "packageName": "lodash"
  }
}
```

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Your Project  │───▶│  MCP Server  │───▶│  SQLite DB  │
│  (TypeScript/   │    │              │    │   (.mcp_    │
│   JavaScript)   │    │  • ts-morph  │    │   index.    │
└─────────────────┘    │  • chokidar  │    │   sqlite)   │
                       │  • WebSocket │    │             │
                       └──────────────┘    └─────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  LLM Agent   │
                       │  (via JSON-  │
                       │   RPC 2.0)   │
                       └──────────────┘
```

### File Structure
- `src/index.ts` - Main server implementation
- `schema.sql` - SQLite database schema  
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Database Schema
The server creates a `.mcp_index.sqlite` file in your project root with tables for:
- `metadata` - Index version and state tracking
- `modules` - Source file information  
- `exports` - Exported declarations from each module
- `deps` - npm dependencies with metadata

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