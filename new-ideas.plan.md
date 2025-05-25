# MCP Server Enhancement Ideas - Anti-Duplication Focus

This document outlines potential enhancements to the MCP server that focus on **preventing agent duplication and inefficiency** rather than duplicating capabilities agents already have.

## Core Philosophy

The MCP server should help agents **avoid doing things they've already done** rather than giving them more ways to do things they can already do. Agents have extensive file access, terminal execution, and search capabilities - but they tend to re-read unchanged files repeatedly.

## Required NPM Packages for New Features

### Phase 1: Essential Utilities (For New Features)
```bash
npm install --save crypto-hash fast-glob node-cache
```

**`crypto-hash`** - Fast, modern file hashing library
- **What it does**: Provides fast hashing algorithms (SHA256, MD5, etc.) for files and strings
- **Why we want it**: Essential for file change detection - we can hash file contents to know if they actually changed, not just if the timestamp changed
- **Use case**: `get_file_metadata` tool needs content hashes to detect real changes vs. just timestamp updates

**`fast-glob`** - Advanced glob pattern matching
- **What it does**: High-performance glob library that's faster and more feature-rich than built-in glob
- **Why we want it**: Better file discovery for project structure analysis and more efficient file watching patterns
- **Use case**: `get_project_outline` tool needs to efficiently discover all relevant files in the project

**`node-cache`** - Simple in-memory caching
- **What it does**: Fast in-memory cache with TTL (time-to-live) support and LRU eviction
- **Why we want it**: Cache expensive operations like TypeScript compilation results, file metadata, project analysis
- **Use case**: Cache results from `cache_typescript_check`, `cache_lint_results` to avoid re-running expensive operations

### Phase 2: Future Dependencies (Not Installing Yet)
```bash
# TypeScript Analysis (when we add dependency graph features)
npm install --save typescript ts-morph

# Persistent Storage (if we decide we need it later)
npm install --save better-sqlite3
```

### Development Dependencies (For New Features)
```bash
npm install --save-dev @types/node-cache
```

**`@types/node-cache`** - TypeScript definitions for node-cache
- **What it does**: Provides TypeScript type definitions for the node-cache package
- **Why we want it**: Ensures type safety when using the cache in our TypeScript code

## Smart Change Detection Tools
**Purpose**: Get only files changed since a specific version/timestamp
**Current vs Enhanced**: 
- Current: `get_project_status` returns all changed files since last refresh
- Enhanced: Allow querying changes since any specific point in time
**Use Case**: Agent can ask "what changed since I last looked 30 minutes ago?"

### `get_file_metadata` 
**Purpose**: Get file size, last modified, hash without reading content
**Benefit**: Agent can quickly check if file needs re-reading without loading content
**Returns**: `{ path, size, lastModified, contentHash, exists }`

### `has_file_changed`
**Purpose**: Check if specific files changed since last read by agent
**Input**: List of file paths + last-known hashes/timestamps
**Output**: Which files actually need re-reading

## Cached Expensive Operations

### `cache_typescript_check`
**Purpose**: Run `tsc --noEmit` and cache results until relevant files change
**Benefit**: Avoid re-running TypeScript compilation on unchanged code
**Invalidation**: Auto-invalidate when .ts/.tsx files or tsconfig.json changes

### `cache_lint_results`
**Purpose**: Run ESLint and cache results per file
**Benefit**: Only re-lint files that actually changed
**Storage**: Per-file lint results with change detection

### `cache_test_results` 
**Purpose**: Cache test results and only re-run when relevant files change
**Smart Invalidation**: Track which tests depend on which source files
**Output**: "Tests X, Y, Z need re-running due to changes in file A"

### `get_cached_operation`
**Purpose**: Retrieve cached results without re-running expensive operations
**Input**: Operation type (typescript|lint|test) + optional file filter
**Output**: Cached results or "cache miss" indication

## Project State Summaries

### `get_project_outline`
**Purpose**: High-level project structure without reading file contents
**Benefit**: Agent gets project overview without parsing every file
**Output**: Directory tree + file types + export summaries

### `get_dependency_graph`
**Purpose**: Import/export relationships without parsing all files
**Caching**: Build once, update incrementally as files change
**Output**: "File A imports from B, exports X, Y, Z"

### `get_file_summary`
**Purpose**: Brief summary of file purpose/exports without full content
**Use Case**: Agent needs to understand file role without reading entire content
**Output**: "React component, exports Button interface + ButtonProps type"

## Anti-Duplication Resources

### Cached Analysis Results
- `cache://typescript-errors` - Cached TypeScript compilation errors
- `cache://lint-results` - Cached ESLint results by file  
- `cache://test-results` - Cached test suite results
- `cache://dependency-graph` - Cached import/export analysis

### Project Metadata
- `metadata://file-hashes` - File content hashes for change detection
- `metadata://project-structure` - Lightweight project tree view
- `metadata://npm-scripts` - Available npm scripts without reading package.json

## Implementation Priority

### Phase 1 - Basic Anti-Duplication
1. `get_file_metadata` - Essential for change detection
2. `has_file_changed` - Core deduplication capability
3. Enhanced change tracking with timestamps

### Phase 2 - Expensive Operation Caching  
1. `cache_typescript_check` - High-impact for TS projects
2. `cache_lint_results` - Frequent operation, good caching candidate
3. `get_cached_operation` - Access layer for cached results

### Phase 3 - Smart Project Analysis
1. `get_project_outline` - Reduce need to scan entire project
2. `get_dependency_graph` - Smart relationship tracking
3. Advanced cache invalidation strategies

## Key Benefits

- **Reduced File Reads**: Agents only read files that actually changed
- **Faster Development**: Skip expensive re-compilation/re-linting
- **Better UX**: Agents spend less time on redundant operations
- **Smarter Workflows**: Change-aware operations and targeted updates

## Anti-Patterns to Avoid

❌ **Don't add**: Tools that duplicate existing agent capabilities
❌ **Don't add**: File reading/content parsing (agents already do this)
❌ **Don't add**: Terminal execution wrappers (agents have run_in_terminal)

✅ **Do add**: Change detection and caching mechanisms
✅ **Do add**: Lightweight metadata and summaries  
✅ **Do add**: Smart invalidation and incremental updates
