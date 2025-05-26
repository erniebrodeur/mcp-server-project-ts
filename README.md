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
- npm or pnpm
- A TypeScript/JavaScript project with `tsconfig.json`

### Quick Start
```bash
# Clone the repository
git clone <this-repo> mcp-server
cd mcp-server

# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm start -- --workspaceRoot /path/to/your/project
```

## 🔧 Usage

### As MCP Server (Recommended)
The server uses **stdio transport** as per MCP specification:

```bash
node dist/index.js --workspaceRoot /path/to/your/project
```

### Integration with AI Clients

**Claude Desktop / Cursor:**
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

**OpenAI Agents SDK:**
```python
from openai_agents_python.mcp import MCPServerStdio

async with MCPServerStdio(
    params={
        "command": "node",
        "args": ["/path/to/dist/index.js", "--workspaceRoot", "/path/to/project"],
    }
) as server:
    tools = await server.list_tools()
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