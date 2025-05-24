# MCP Server Scaffold

This repo contains a ready‑to‑develop scaffold for a Model Context Protocol (MCP) server that indexes a JavaScript/TypeScript workspace for LLM agents.

## One‑Time Setup

```bash
# from your project root
./bin/init-mcp-server.sh .mcp-server
```

The script will:

1. Copy the scaffold into `.mcp-server/`
2. Initialise a git repo and make the first commit
3. Run `npm install`

## Development

```bash
cd .mcp-server
npm run watch
```

## Build & Run

```bash
npm run build
npm run start -- --workspaceRoot "<absolute_path_to_your_workspace>"
```

See `design_notes.md` for the high‑level architecture and requirements.