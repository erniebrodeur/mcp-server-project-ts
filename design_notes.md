# MCP Server Design Notes

_Last updated: 2025-05-24_

## 1. Working Definition
**Model Context Protocol (MCP)** — an open JSON‑RPC standard for integrating LLM hosts with external services. Our server will expose project context to agentic IDE extensions.

## 2. Primary Objectives
Provide a low‑latency, always‑fresh index of a JS/TS workspace so agents don’t waste tokens repeatedly reading static files.

## 3. Functional Requirements
• Initial AST scan with ts‑morph  
• Dirty tracking via chokidar  
• Incremental `index.refresh()`  
• Resources: `index.status`, `project.summary`, `deps.list`, `module.list`, `module.details`  
• Tools: `index.refresh`, `search.query`, `snippet.fetch`

## 4. Non‑Functional Requirements
Latency <100 ms, index rebuild resilient to parse errors, memory <500 MB.

## 5. Tech Stack
Node 20, ts‑morph, better‑sqlite3, chokidar, ws, TypeScript.

## 6. High‑Level Architecture
```
(local repo) ─(fs events)─> Scanner/Indexer ─SQLite─ MCP Server ─WS─> LLM Host
```

## 7. Dirty‑Bit Semantics
`dirty=true` → at least one cached resource is stale; agent should run `index.refresh()` then re‑fetch resources.

## 8. Lifecycle & IDE Integration
IDE extension launches server on workspace open, connects over local WebSocket, server watches files for updates.

## 9. Initialization Script
One‑time dev bootstrap: scaffold files, git init, npm install, first commit.