# Cache Layer Implementation Plan - Step by Step

**Target**: Implement the cache layer and anti-duplication features outlined in `new-ideas.plan.md`

**Philosophy**: Help agents avoid doing things they've already done - prevent re-reading unchanged files and re-running expensive operations.

## 🎯 Current Status

✅ **Phase 1 COMPLETED**: Cache Infrastructure  
✅ **Phase 2 COMPLETED**: Basic Anti-Duplication Tools  
✅ **Phase 3 COMPLETED**: Expensive Operation Caching  
✅ **Phase 4 COMPLETED**: Project State Summaries  
⏳ **Phase 5 PENDING**: Anti-Duplication Resources  
⏳ **Phase 6 PENDING**: Cache Management & Configuration  

### Phase 1, 2, 3 & 4 Achievements:
- ✅ Core cache infrastructure with CacheManager and FileMetadataService
- ✅ Smart file change detection with content hashing
- ✅ Anti-duplication tools: `get_file_metadata` and `has_file_changed`
- ✅ Enhanced change tracking with timestamps
- ✅ Expensive operation caching framework
- ✅ TypeScript compilation caching with `cache_typescript_check`
- ✅ Lint results caching with `cache_lint_results`
- ✅ Test results caching with `cache_test_results`
- ✅ Cache access tool: `get_cached_operation`
- ✅ Project state summary tools: `get_project_outline` and `get_file_summary`
- ✅ Full test coverage with working test suite for all phases

**New Tools Available**:
- `get_file_metadata` - Get file size, hash, and metadata without reading content
- `has_file_changed` - Compare file hashes to detect actual changes
- `cache_typescript_check` - Cache TypeScript compilation results with smart invalidation
- `cache_lint_results` - Cache ESLint results per file with change detection
- `cache_test_results` - Cache test suite results with dependency tracking
- `get_cached_operation` - Retrieve cached results without re-running operations
- `get_project_outline` - Get high-level project structure without reading file contents
- `get_file_summary` - Get lightweight file analysis for exports/imports/type classification

---

## Phase 1: Install Required Dependencies & Cache Infrastructure

### Step 1.1: Install NPM Packages
```bash
# Essential utilities for cache layer
npm install --save crypto-hash fast-glob node-cache

# TypeScript types for new packages
npm install --save-dev @types/node-cache
```

**Packages Purpose**:
- `crypto-hash`: Fast file hashing for content change detection
- `fast-glob`: High-performance file discovery and pattern matching
- `node-cache`: In-memory cache with TTL and LRU eviction
- `@types/node-cache`: TypeScript definitions

### Step 1.2: Create Cache Layer Types
**File**: `src/types/cache.ts`
- Cache operation result types
- File metadata types  
- Cache configuration interfaces
- Cached operation types (typescript, lint, test)

### Step 1.3: Create Core Cache Manager
**File**: `src/cache/cache-manager.ts`
- Wrapper around `node-cache` with enhanced features
- Cache key generation and management
- TTL policies for different operation types
- Cache statistics and hit/miss tracking
- Memory usage monitoring

### Step 1.4: Create File Metadata Service
**File**: `src/cache/file-metadata.ts`
- File hashing using `crypto-hash`
- File stats collection (size, mtime, etc.)
- Content hash calculation and caching
- File existence and change detection utilities

### Step 1.5: Update Type Definitions
**Update**: `src/types/index.ts`
- Add cache-related interfaces
- File metadata types
- Hash comparison types

## Phase 2: Basic Anti-Duplication Tools

### Step 2.1: Implement `get_file_metadata` Tool
**Purpose**: Get file size, last modified, hash without reading content
**Benefits**: Agent can check if file needs re-reading without loading content

**Implementation**:
- Add tool definition to `src/handlers/tools.ts`
- Create handler function that uses file metadata service
- Return: `{ path, size, lastModified, contentHash, exists }`
- Cache metadata for performance

### Step 2.2: Implement `has_file_changed` Tool  
**Purpose**: Check if specific files changed since last read by agent
**Benefits**: Core deduplication capability

**Implementation**:
- Input: List of file paths + last-known hashes/timestamps
- Compare current hashes with provided hashes
- Output: Which files actually need re-reading
- Batch operation for efficiency

### Step 2.3: Enhanced Change Tracking
**Update**: `src/tracking/change-tracker.ts`
- Add timestamp-based queries ("what changed since X minutes ago?")
- Store change history with timestamps
- Support for version/timestamp-based change queries
- Cache change detection results

**New Features**:
- `getChangesSince(timestamp)` method
- `getChangesSinceVersion(version)` method
- Historical change tracking

## Phase 3: Expensive Operation Caching

### Step 3.1: Create Operation Cache Framework
**File**: `src/cache/operation-cache.ts`
- Generic framework for caching expensive operations
- Smart invalidation based on file changes
- Operation result storage and retrieval
- Cache warming and background updates

### Step 3.2: Implement TypeScript Compilation Caching
**Tool**: `cache_typescript_check`
**Purpose**: Run `tsc --noEmit` and cache results until relevant files change

**Implementation**:
- **File**: `src/cache/typescript-cache.ts`
- Use existing `process-utils.ts` to run `tsc --noEmit`
- Cache results per compilation hash (based on source files + tsconfig)
- Auto-invalidate when .ts/.tsx files or tsconfig.json changes
- Store compilation errors and warnings

### Step 3.3: Implement Lint Results Caching
**Tool**: `cache_lint_results`
**Purpose**: Run ESLint and cache results per file

**Implementation**:
- **File**: `src/cache/lint-cache.ts`
- Per-file lint result caching
- Batch linting with smart invalidation
- Support for different linters (ESLint, TSLint, etc.)
- Integration with existing project linting config

### Step 3.4: Implement Test Results Caching
**Tool**: `cache_test_results`
**Purpose**: Cache test results and only re-run when relevant files change

**Implementation**:
- **File**: `src/cache/test-cache.ts`
- Test dependency tracking (which tests depend on which source files)
- Smart test re-running based on file changes
- Test result storage and analysis
- Integration with common test frameworks (Jest, Mocha, etc.)

### Step 3.5: Create Cache Access Tool
**Tool**: `get_cached_operation`
**Purpose**: Retrieve cached results without re-running expensive operations

**Implementation**:
- Unified interface for accessing cached results
- Input: operation type (typescript|lint|test) + optional file filter
- Output: cached results or "cache miss" indication
- Support for partial results and incremental updates

## Phase 4: Project State Summaries

### Step 4.1: Implement Project Outline Tool
**Tool**: `get_project_outline`
**Purpose**: High-level project structure without reading file contents

**Implementation**:
- **File**: `src/analysis/project-outline.ts`
- Use `fast-glob` for efficient file discovery
- Generate directory tree + file type analysis
- Cache project structure analysis
- Export/import basic analysis without full AST parsing

### Step 4.2: Create File Summary Generator
**Tool**: `get_file_summary`
**Purpose**: Brief summary of file purpose/exports without full content

**Implementation**:
- **File**: `src/analysis/file-summary.ts`
- Lightweight file analysis (imports/exports detection)
- File type classification (component, utility, config, etc.)
- Cache file summaries with content hash validation
- Basic export detection without full parsing

### Step 4.3: Build Dependency Graph (Phase 2 - Future)
**Tool**: `get_dependency_graph`
**Note**: Deferred to Phase 2 as it requires TypeScript/AST analysis

**Preparation**:
- Design interfaces for dependency relationships
- Plan incremental graph building
- Cache invalidation strategies for graph updates

## Phase 5: Anti-Duplication Resources

### Step 5.1: Create Cached Resource System
**Update**: `src/handlers/resources.ts`
- Add cached analysis result resources
- Resource versioning based on cache state
- Dynamic resource generation from cache

**New Resources**:
- `cache://typescript-errors` - Cached TypeScript compilation errors
- `cache://lint-results` - Cached ESLint results by file
- `cache://test-results` - Cached test suite results
- `metadata://file-hashes` - File content hashes for change detection
- `metadata://project-structure` - Lightweight project tree view

### Step 5.2: Implement Metadata Resources
**Implementation**:
- File hash resources for change detection
- Project structure resources without full content
- npm scripts discovery without reading package.json
- Cached dependency information

## Phase 6: Cache Management & Configuration

### Step 6.1: Add Cache Configuration
**Update**: `src/core/config.ts`
- Cache TTL settings for different operation types
- Memory limits and eviction policies
- Cache warming strategies
- Performance tuning options

### Step 6.2: Create Cache Management Tools
**Tools**:
- `clear_cache` - Clear specific cache entries or all cache
- `get_cache_stats` - Cache hit/miss ratios and performance metrics
- `warm_cache` - Pre-populate cache with common operations

### Step 6.3: Add Cache Monitoring
**File**: `src/cache/cache-monitor.ts`
- Memory usage tracking
- Performance metrics collection
- Cache effectiveness analysis
- Auto-cleanup and optimization

## Implementation Timeline & Priority

### Week 1: Foundation (Phase 1) ✅ COMPLETED
- [x] Install dependencies
- [x] Create cache layer types and interfaces
- [x] Implement core cache manager
- [x] Build file metadata service
- [x] Basic cache infrastructure testing

### Week 2: Core Tools (Phase 2) ✅ COMPLETED
- [x] Implement `get_file_metadata` tool
- [x] Implement `has_file_changed` tool
- [x] Enhanced change tracking with timestamps
- [x] Integration testing with existing tools

### Week 3: Operation Caching (Phase 3)
- [ ] Operation cache framework
- [ ] TypeScript compilation caching
- [ ] Lint results caching
- [ ] Cache access tools
- [ ] Performance testing and optimization

### Week 4: Project Analysis (Phase 4)
- [ ] Project outline generation
- [ ] File summary generation
- [ ] Resource system enhancement
- [ ] End-to-end testing

### Week 5: Polish & Documentation (Phase 5-6)
- [ ] Cache management tools
- [ ] Performance monitoring
- [ ] Documentation updates
- [ ] Production readiness testing

## Success Metrics

### Performance Improvements
- **File Change Detection**: 10x faster with hash-based detection
- **TypeScript Checking**: 5x faster with caching (skip unchanged files)
- **Project Analysis**: 3x faster with cached project structure
- **Agent Efficiency**: 50% reduction in redundant file reads

### Anti-Duplication Impact
- Track cache hit rates (target: >80% for repeated operations)
- Measure agent time savings (target: 30% reduction in duplicate work)
- Monitor memory usage (target: <500MB for large projects)
- File re-read reduction (target: 70% fewer unnecessary file reads)

## Risk Mitigation

### Cache Invalidation
- Robust file change detection to prevent stale cache
- Conservative TTL policies for critical operations
- Manual cache clearing tools for debugging
- Validation mechanisms for cache consistency

### Memory Management
- LRU eviction for memory pressure
- TTL-based cleanup for unused entries
- Memory monitoring and alerts
- Graceful degradation when cache is full

### Error Handling
- Fallback to non-cached operations on cache failures
- Detailed error logging for cache misses/errors
- Recovery mechanisms for corrupted cache state
- Isolated cache failures (don't break main functionality)

## Future Extensions (Post-Phase 1)

### Phase 2 Dependencies (When Ready)
```bash
# TypeScript analysis capabilities
npm install --save typescript ts-morph

# Persistent storage for large projects
npm install --save better-sqlite3
```

### Advanced Features
- **AST-based dependency analysis** using `ts-morph`
- **Persistent cache storage** for large projects using SQLite
- **Distributed caching** for monorepo support
- **Cache sharing** between multiple agents/sessions
- **Predictive caching** based on usage patterns

This plan transforms the MCP server from a simple change tracker into a smart anti-duplication system that significantly reduces agent workload and improves development efficiency.
