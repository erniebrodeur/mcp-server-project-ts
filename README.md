# MCP Server for TypeScript/JavaScript Projects

A **Model Context Protocol (MCP)** server that provides real-time project context indexing for TypeScript and JavaScript workspaces. This server enables LLM agents to efficiently understand your codebase structure without repeatedly parsing files.

## What It Does ✅

### Core Functionality
- **🔍 Project Scanning**: Analyzes TypeScript/JavaScript files using `ts-morph` AST parsing
- **📊 SQLite Index**: Maintains a persistent database of modules, exports, and dependencies  
- **⚡ Real-time Updates**: Watches files with `chokidar` and tracks changes with dirty-bit semantics
- **📦 Dependency Management**: Install/uninstall npm packages via JSON-RPC
- **🔌 JSON-RPC API**: WebSocket server providing programmatic access to project data

### Data Indexed
- **Modules**: File paths and summary comments from each source file
- **Exports**: All exported declarations (functions, classes, types, etc.) with their types
- **Dependencies**: npm packages with metadata (version, homepage, repository, docs)
- **Metadata**: Index version, last scan time, and dirty state tracking

### Available JSON-RPC Methods
- `index.status` - Get current index state and dirty status
- `index.refresh` - Perform incremental update of changed files
- `deps.install` - Install npm packages (with dev dependency support)
- `deps.uninstall` - Remove npm packages

## What It Doesn't Do ❌

This is a **context indexing server**, not a full IDE language server. It does not provide:
- Code completion or IntelliSense
- Error checking or diagnostics  
- Refactoring capabilities
- Debugging features
- Full-text search (yet - planned for future)
- Code snippet extraction (yet - planned for future)

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