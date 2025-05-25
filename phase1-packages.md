# Phase 1 NPM Package Installation Plan

## Packages to Install

### Runtime Dependencies
```bash
npm install --save crypto-hash fast-glob node-cache
```

### Development Dependencies  
```bash
npm install --save-dev @types/node-cache
```

## Package Details & Justification

### 1. `crypto-hash` 
**Purpose**: Fast, modern file hashing library
**What it does**: 
- Provides fast hashing algorithms (SHA256, MD5, etc.) for files and strings
- Works with both Node.js and modern ES modules
- Much faster than built-in crypto module for file operations

**Why we want it**:
- Essential for smart file change detection
- Allows us to detect if file *content* actually changed vs. just timestamp updates
- Agents can avoid re-reading files that haven't actually changed
- Core to the anti-duplication philosophy

**Specific use cases**:
- `get_file_metadata` tool: Return content hash without reading full file content
- `has_file_changed` tool: Compare current hash vs. stored hash
- Smart cache invalidation: Only invalidate cache when content hash changes

---

### 2. `fast-glob`
**Purpose**: High-performance glob pattern matching
**What it does**:
- Advanced glob library that's faster and more feature-rich than built-in patterns
- Supports complex patterns, negation, multiple patterns
- Async/sync support with better performance than alternatives

**Why we want it**:
- More efficient file discovery for project analysis
- Better performance for watching large numbers of files
- Advanced pattern matching for smarter file filtering

**Specific use cases**:
- `get_project_outline` tool: Efficiently discover all relevant files
- Enhanced file watching: More precise patterns to avoid unnecessary watches
- File filtering: Better exclusion patterns for node_modules, build dirs, etc.

---

### 3. `node-cache`
**Purpose**: Simple, fast in-memory caching
**What it does**:
- In-memory cache with TTL (time-to-live) support
- LRU (Least Recently Used) eviction
- Simple get/set/delete operations
- Built-in statistics and cache hit/miss tracking

**Why we want it**:
- Cache expensive operations to prevent agent re-work
- Store file metadata, compilation results, project analysis
- Fast access (in-memory) with automatic cleanup (TTL)
- Perfect for our anti-duplication goals

**Specific use cases**:
- Cache TypeScript compilation results from `tsc --noEmit`
- Cache file metadata (size, hash, modified time)
- Cache project structure analysis
- Store expensive operation results with auto-expiration

---

### 4. `@types/node-cache`
**Purpose**: TypeScript definitions for node-cache
**What it does**: Provides complete TypeScript type definitions
**Why we want it**: Type safety and IntelliSense support for cache operations

## Benefits of This Package Set

### Immediate Capabilities
1. **Smart Change Detection**: Hash-based file change detection
2. **Efficient File Discovery**: Fast glob patterns for project analysis  
3. **Operation Caching**: Cache expensive results to prevent re-work
4. **Type Safety**: Full TypeScript support

### Anti-Duplication Impact
- Agents can check if files *actually* changed (content hash) vs. just timestamp
- Expensive operations (compilation, linting) get cached and reused
- Project analysis gets cached instead of re-scanning every time
- Smart invalidation: only re-run operations when relevant files actually change

### Performance Benefits
- `crypto-hash`: 2-3x faster than built-in crypto for file hashing
- `fast-glob`: 1.5-2x faster than alternatives for file discovery
- `node-cache`: Near-instant access to cached results vs. re-computation

## What We're NOT Installing (Yet)

- **TypeScript/AST libraries**: Too complex for Phase 1, focus on basic utilities first
- **Persistent storage**: In-memory cache is simpler and sufficient for now
- **Heavy analysis tools**: Will add when we have the basic infrastructure working

This focused approach gives us the core utilities needed to implement smart change detection and caching without overwhelming complexity.
