# MCP Project Change Tracker

A **Model Context Protocol (MCP) compliant server** for TypeScript/JavaScript project change tracking and dependency management.

## Overview

This MCP server provides AI agents with structured tools to track file changes and manage dependencies in TypeScript/JavaScript projects. It follows the **change notification pattern** - tracking *which* files have changed without storing their content, allowing agents to read files themselves when needed.

## 🚀 Key Features

- **File Change Tracking**: Monitor TypeScript/JavaScript file modifications
- **NPM Dependency Management**: Install, uninstall, update, and audit packages
- **Script Execution**: Run npm scripts with real-time output
- **Project Status**: Get comprehensive project state information
- **MCP Compliant**: Works with any MCP-compatible AI client
- **Lightweight**: Only tracks changes, doesn't store file content

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `get_project_status` | Get project status with changed files and dependencies |
| `refresh_changes` | Clear change tracking state |
| `install_dependency` | Install npm packages (dev/prod) |
| `uninstall_dependency` | Remove npm packages |
| `update_dependency` | Update specific packages |
| `check_outdated` | List outdated dependencies |
| `run_npm_script` | Execute package.json scripts |
| `list_scripts` | Show available npm scripts |
| `npm_audit` | Security vulnerability audit |

📖 **[View detailed examples and API reference →](docs/examples.md)**

## 📦 Installation

### Prerequisites
- Node.js 20+
- npm (comes with Node.js)
- A TypeScript/JavaScript project

### Quick Start with npx (Recommended)
```bash
# Run directly with npx - no installation needed!
npx mcp-server-project-ts --workspaceRoot /path/to/your/project
```

### Alternative: Global Installation
```bash
# Install globally for repeated use
npm install -g mcp-server-project-ts

# Then run anywhere
mcp-server-project --workspaceRoot /path/to/your/project
```

## 🔧 Usage

### VS Code Integration
Add to your VS Code settings or MCP configuration:

```json
{
  "mcpServers": {
    "mcp-server-project-ts": {
      "command": "npx",
      "args": ["mcp-server-project-ts", "--workspaceRoot", "${workspaceFolder}"]
    }
  }
}
```

### Claude Desktop Integration
Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "mcp-server-project-ts": {
      "command": "npx",
      "args": ["mcp-server-project-ts", "--workspaceRoot", "/path/to/your/project"]
    }
  }
}
```

## 🏗️ Development

```bash
# Development mode with auto-restart
npm run dev -- --workspaceRoot .

# Build for production
npm run build

# Run tests
npm test
```

## 🎯 Why MCP?

This server follows the **Model Context Protocol** specification, providing:

- ✅ **Standardization**: Works with any MCP-compatible client
- ✅ **Discoverability**: Tools are self-describing with schemas  
- ✅ **Type Safety**: Input validation via JSON schemas
- ✅ **Documentation**: Built-in tool descriptions for AI agents
- ✅ **Interoperability**: Part of the growing MCP ecosystem

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📚 Documentation

- [Detailed Examples & API Reference](docs/examples.md)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)