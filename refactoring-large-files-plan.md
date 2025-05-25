# Refactoring Plan: Large Files Cleanup

## Problem Analysis
Several files have grown too large and need to be split into smaller, more maintainable modules:

**Large Files (>300 lines):**
- `src/handlers/tools.ts` - **1093 lines** (CRITICAL - needs immediate attention)
- `src/cache/cache-monitor.ts` - 380 lines
- `src/cache/test-cache.ts` - 372 lines
- `src/analysis/project-outline.ts` - 341 lines
- `src/analysis/file-summary.ts` - 336 lines
- `src/cache/cached-resource-manager.ts` - 331 lines
- `src/cache/lint-cache.ts` - 303 lines

**Medium Files (250-300 lines):**
- `src/types/cache.ts` - 295 lines
- `src/handlers/resources.ts` - 250 lines

## Phase 1: Split Tools Handler (PRIORITY 1)

### Current Structure Analysis
`src/handlers/tools.ts` contains:
1. **Tool Definitions Array** (~15+ tool schemas)
2. **Massive createToolHandlers Function** (800+ lines)
3. **Registration Function**

### Proposed Structure
Split into multiple files by functional area:

```
src/handlers/
├── tools/
│   ├── index.ts                    # Main exports and registration
│   ├── project-state-tools.ts      # Project status & change tracking
│   ├── package-tools.ts            # NPM package management
│   ├── file-tools.ts               # File metadata & analysis
│   ├── dev-ops-tools.ts            # Compile/lint/test operations
│   ├── analysis-tools.ts           # Project structure analysis
│   └── cache-tools.ts              # Cache management operations
└── resources.ts                    # Keep as-is for now
```

### Revised Tool Categories (Domain-Driven):

#### 1. Project State Tools (`project-state-tools.ts`)
**Purpose**: Track and manage overall project state and changes
- `get_project_status` - Get project state, dependencies, changed files
- `refresh_changes` - Reset change tracking state
- `has_file_changed` - Compare file hashes to detect changes

#### 2. Package Management Tools (`package-tools.ts`)
**Purpose**: Handle npm package installation/removal
- `install_dependency` - Install npm packages
- `uninstall_dependency` - Remove npm packages

#### 3. File Operations Tools (`file-tools.ts`)
**Purpose**: File-level metadata and content analysis
- `get_file_metadata` - Get file stats, hashes without reading content
- `get_file_summary` - Analyze file exports/imports/complexity

#### 4. Development Operations Tools (`dev-ops-tools.ts`)
**Purpose**: Run development operations (compile, lint, test)
- `cache_typescript_check` - Run TypeScript compilation with caching
- `cache_lint_results` - Run ESLint with caching  
- `cache_test_results` - Run tests with caching
- `get_cached_operation` - Retrieve cached operation results

#### 5. Project Analysis Tools (`analysis-tools.ts`)
**Purpose**: High-level project structure analysis
- `get_project_outline` - Generate project structure tree

#### 6. Cache Management Tools (`cache-tools.ts`)
**Purpose**: Direct cache manipulation and monitoring
- `clear_cache` - Clear cache by type/pattern
- `get_cache_stats` - Get cache performance metrics
- `warm_cache` - Pre-populate cache

### Implementation Steps:

#### STEP 1: Prepare Directory Structure
- [x] Create `src/handlers/tools/` directory (if not exists)
- [x] Create 6 empty tool files:
  - [x] `project-state-tools.ts`
  - [x] `package-tools.ts`
  - [x] `file-tools.ts`
  - [x] `dev-ops-tools.ts`
  - [x] `analysis-tools.ts`
  - [x] `cache-tools.ts`

#### STEP 2: Extract Tool Definitions (Exact Schema Copy)
**From `tools.ts` lines 11-300, copy exact tool schemas:**

**To `project-state-tools.ts`:**
- [x] Copy `get_project_status` schema (lines 11-20)
- [x] Copy `refresh_changes` schema (lines 21-30)
- [x] Copy `has_file_changed` schema (lines 82-95)

**To `package-tools.ts`:**
- [x] Copy `install_dependency` schema (lines 31-52)
- [x] Copy `uninstall_dependency` schema (lines 53-65)

**To `file-tools.ts`:**
- [x] Copy `get_file_metadata` schema (lines 66-81)
- [x] Copy `get_file_summary` schema (lines 190-215)

**To `dev-ops-tools.ts`:**
- [x] Copy `cache_typescript_check` schema (lines 96-106)
- [x] Copy `cache_lint_results` schema (lines 107-125)
- [x] Copy `cache_test_results` schema (lines 126-140)
- [x] Copy `get_cached_operation` schema (lines 141-160)

**To `analysis-tools.ts`:**
- [x] Copy `get_project_outline` schema (lines 161-189)

**To `cache-tools.ts`:**
- [x] Copy `clear_cache` schema (lines 216-243)
- [x] Copy `get_cache_stats` schema (lines 244-266)
- [x] Copy `warm_cache` schema (lines 267-298)

#### STEP 3: Extract Handler Implementations (Exact Function Copy)
**From `createToolHandlers` function (lines 319-1065), copy exact handler implementations:**

**To `project-state-tools.ts`:**
- [x] Copy `get_project_status` handler (lines 330-350)
- [x] Copy `refresh_changes` handler (lines 351-370)
- [x] Copy `has_file_changed` handler (lines 427-475)

**To `package-tools.ts`:**
- [x] Copy `install_dependency` handler (lines 371-390)
- [x] Copy `uninstall_dependency` handler (lines 391-410)

**To `file-tools.ts`:**
- [x] Copy `get_file_metadata` handler (lines 411-426)
- [x] Copy `get_file_summary` handler (lines 715-780)

**To `dev-ops-tools.ts`:**
- [x] Copy `cache_typescript_check` handler (lines 476-497)
- [x] Copy `cache_lint_results` handler (lines 498-550)
- [x] Copy `cache_test_results` handler (lines 551-577)
- [x] Copy `get_cached_operation` handler (lines 578-625)

**To `analysis-tools.ts`:**
- [x] Copy `get_project_outline` handler (lines 626-714)

**To `cache-tools.ts`:**
- [x] Copy `clear_cache` handler (lines 781-840)
- [x] Copy `get_cache_stats` handler (lines 841-900)
- [x] Copy `warm_cache` handler (lines 901-1060)

#### STEP 4: Create Unified Index File
- [ ] Create `src/handlers/tools/index.ts`
- [ ] Import all tool definitions from 6 files
- [ ] Export unified `tools` array
- [ ] Import all handler functions from 6 files  
- [ ] Export unified `createToolHandlers` function
- [ ] Export `registerToolHandlers` function

#### STEP 5: Update Main Tools File
- [ ] Replace `src/handlers/tools.ts` content with single import/export from index
- [ ] Remove original 1000+ lines of code
- [ ] Keep only: import from './tools/index.js' and re-export

#### CRITICAL: Import Dependencies Per File

**Each tool file MUST import exactly what it needs:**

**All files need:**
```typescript
import { Tool } from "../../types/mcp.js";
import type { ToolHandler } from "../../types/index.js";
```

**`project-state-tools.ts` needs:**
```typescript
import type { IChangeTracker, IFileUtils } from "../../types/index.js";
```

**`package-tools.ts` needs:**
```typescript
import type { INpmManager } from "../../types/index.js";
```

**`file-tools.ts` needs:**
```typescript
import type { IFileMetadataService } from "../../types/index.js";
import { FileSummaryGenerator } from "../../analysis/file-summary.js";
```

**`dev-ops-tools.ts` needs:**
```typescript
import type { IFileMetadataService, ICacheManager } from "../../types/index.js";
import { TypeScriptCache } from "../../cache/typescript-cache.js";
import { LintCache } from "../../cache/lint-cache.js";
import { TestCache } from "../../cache/test-cache.js";
```

**`analysis-tools.ts` needs:**
```typescript
import type { IFileMetadataService, ICacheManager } from "../../types/index.js";
import { ProjectOutlineGenerator } from "../../analysis/project-outline.js";
```

**`cache-tools.ts` needs:**
```typescript
import type { IFileMetadataService, ICacheManager, ICacheMonitor } from "../../types/index.js";
import { TypeScriptCache } from "../../cache/typescript-cache.js";
import { LintCache } from "../../cache/lint-cache.js";
import { TestCache } from "../../cache/test-cache.js";
import { ProjectOutlineGenerator } from "../../analysis/project-outline.js";
import { FileSummaryGenerator } from "../../analysis/file-summary.js";
```

#### STEP 7: Validation & Testing
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Run existing tests: `npm test`
- [ ] Test all 15 tools using test scripts:
  - [ ] `node test-phase2-tools.js`
  - [ ] `node test-phase3-tools.js`
  - [ ] `node test-phase4-tools.js`

## Phase 2: Split Cache Monitor (PRIORITY 2)

### Current Issues
`src/cache/cache-monitor.ts` (380 lines) contains:
- Monitoring logic
- Cleanup logic
- Performance analysis
- Report generation

### Proposed Split:
```
src/cache/monitoring/
├── cache-monitor.ts          # Main monitor orchestration (150 lines)
├── cleanup-manager.ts        # Cleanup strategies and execution
├── performance-analyzer.ts   # Performance tracking and analysis
└── report-generator.ts       # Report generation utilities
```

## Phase 3: Split Analysis Files (PRIORITY 3)

### Project Outline Generator (341 lines)
Split into:
```
src/analysis/outline/
├── project-outline-generator.ts  # Main generator (150 lines)
├── directory-scanner.ts          # Directory traversal logic
├── file-analyzer.ts              # File type analysis
└── outline-formatter.ts          # Output formatting
```

### File Summary Generator (336 lines)
Split into:
```
src/analysis/summary/
├── file-summary-generator.ts     # Main generator (150 lines)
├── content-analyzer.ts           # Content parsing logic
├── export-parser.ts              # Export/import detection
└── complexity-calculator.ts      # Complexity metrics
```

## Phase 4: Split Large Cache Files (PRIORITY 4)

### Test Cache (372 lines)
Split into:
```
src/cache/test/
├── test-cache.ts              # Main cache interface
├── test-runner.ts             # Test execution logic
├── result-parser.ts           # Result parsing
└── test-discovery.ts          # Test file discovery
```

### Lint Cache (303 lines)
Split into:
```
src/cache/lint/
├── lint-cache.ts              # Main cache interface
├── linter-runner.ts           # ESLint execution
├── result-processor.ts        # Result processing
└── config-resolver.ts         # ESLint config resolution
```

### Cached Resource Manager (331 lines)
Split into:
```
src/cache/resources/
├── cached-resource-manager.ts    # Main manager
├── resource-generators.ts        # Resource generation logic
├── metadata-collector.ts         # Metadata collection
└── cache-resource-builder.ts     # Cache resource building
```

## Phase 5: Types Refactoring (PRIORITY 5)

### Cache Types (295 lines)
Split into:
```
src/types/cache/
├── index.ts                   # Main exports
├── interfaces.ts              # Core interfaces
├── monitoring.ts              # Monitoring-related types
├── operations.ts              # Operation-related types
└── resources.ts               # Resource-related types
```

## Implementation Priority and Timeline

### Week 1: Tools Handler Refactoring
- **Critical**: Split `tools.ts` immediately
- Impact: Major maintainability improvement
- Risk: High (touches main functionality)

### Week 2: Cache Monitor and Analysis
- Split cache monitor and analysis files
- Impact: Medium maintainability improvement
- Risk: Medium

### Week 3: Remaining Cache Files
- Split remaining large cache files
- Impact: Medium maintainability improvement
- Risk: Low

### Week 4: Types and Cleanup
- Split types and final cleanup
- Impact: Low-medium maintainability improvement
- Risk: Low

## Benefits of This Refactoring

1. **Improved Maintainability**: Smaller, focused files are easier to understand and modify
2. **Better Separation of Concerns**: Each file has a single responsibility
3. **Easier Testing**: Smaller modules can be tested in isolation
4. **Reduced Merge Conflicts**: Multiple developers can work on different tool categories
5. **Better Code Navigation**: IDE navigation becomes more efficient
6. **Easier Code Reviews**: Smaller files mean more focused reviews

## Rollback Strategy

1. **Git Branching**: Perform refactoring in feature branches
2. **Incremental Merging**: Merge one category at a time
3. **Comprehensive Testing**: Run full test suite after each merge
4. **Backwards Compatibility**: Maintain all existing exports during transition

## Success Metrics

- All files under 200 lines (target)
- No functionality regressions
- Improved test coverage where possible
- Maintained or improved performance
- Reduced complexity scores (if using complexity analysis tools)

## Implementation Checklist

### CURRENT STATE ANALYSIS
The tools directory already exists but is incomplete:
```
✅ src/handlers/tools/ (exists)
✅ src/handlers/tools/status-tools.ts (exists but EMPTY)
✅ src/handlers/tools/dependency-tools.ts (exists but EMPTY)
❌ src/handlers/tools/index.ts (MISSING)
❌ src/handlers/tools/metadata-tools.ts (MISSING)
❌ src/handlers/tools/cache-tools.ts (MISSING)
❌ src/handlers/tools/analysis-tools.ts (MISSING)
❌ src/handlers/tools/validation-tools.ts (MISSING)
```

### EXACT TOOL BREAKDOWN FROM CURRENT tools.ts:
**15 tools total** identified in this exact order:
1. `get_project_status` → status-tools.ts
2. `refresh_changes` → status-tools.ts  
3. `install_dependency` → dependency-tools.ts
4. `uninstall_dependency` → dependency-tools.ts
5. `get_file_metadata` → metadata-tools.ts
6. `has_file_changed` → metadata-tools.ts
7. `cache_typescript_check` → validation-tools.ts
8. `cache_lint_results` → validation-tools.ts
9. `cache_test_results` → validation-tools.ts
10. `get_cached_operation` → cache-tools.ts
11. `get_project_outline` → analysis-tools.ts
12. `get_file_summary` → analysis-tools.ts
13. `clear_cache` → cache-tools.ts
14. `get_cache_stats` → cache-tools.ts
15. `warm_cache` → cache-tools.ts

### Phase 1: Tools Handler Refactoring ⚠️ CRITICAL PRIORITY

#### Pre-work
- [ ] Create feature branch `refactor/complete-tools-split`
- [ ] Backup current `tools.ts` file (cp tools.ts tools.ts.backup)
- [ ] Run `npm run build` to establish baseline
- [ ] Run test suite to establish baseline

#### 1. Complete Directory Structure Setup
- [x] ~~Create `src/handlers/tools/` directory~~ (already exists)
- [ ] Create `src/handlers/tools/index.ts` (main orchestrator file)
- [x] ~~Create `src/handlers/tools/status-tools.ts`~~ (exists but empty)
- [x] ~~Create `src/handlers/tools/dependency-tools.ts`~~ (exists but empty)
- [ ] Create `src/handlers/tools/metadata-tools.ts`
- [ ] Create `src/handlers/tools/cache-tools.ts`
- [ ] Create `src/handlers/tools/analysis-tools.ts`
- [ ] Create `src/handlers/tools/validation-tools.ts`

#### Tool Definitions Migration
- [ ] Move status tool schemas to `status-tools.ts`
  - [ ] `get_project_status`
  - [ ] `refresh_changes`
  - [ ] `has_file_changed`
- [ ] Move dependency tool schemas to `dependency-tools.ts`
  - [ ] `install_dependency`
  - [ ] `uninstall_dependency`
- [ ] Move metadata tool schemas to `metadata-tools.ts`
  - [ ] `get_file_metadata`
- [ ] Move cache tool schemas to `cache-tools.ts`
  - [ ] `clear_cache`
  - [ ] `get_cache_stats`
  - [ ] `warm_cache`
  - [ ] `get_cached_operation`
- [ ] Move analysis tool schemas to `analysis-tools.ts`
  - [ ] `get_project_outline`
  - [ ] `get_file_summary`
- [ ] Move validation tool schemas to `validation-tools.ts`
  - [ ] `cache_typescript_check`
  - [ ] `cache_lint_results`
  - [ ] `cache_test_results`

#### Handler Functions Migration
- [ ] Move status handlers to `status-tools.ts`
- [ ] Move dependency handlers to `dependency-tools.ts`
- [ ] Move metadata handlers to `metadata-tools.ts`
- [ ] Move cache handlers to `cache-tools.ts`
- [ ] Move analysis handlers to `analysis-tools.ts`
- [ ] Move validation handlers to `validation-tools.ts`

#### Integration
- [ ] Create unified exports in `tools/index.ts`
- [ ] Combine all tool definitions arrays
- [ ] Combine all handler objects
- [ ] Export main `registerToolHandlers` function
- [ ] Update imports in `src/core/server.ts`
- [ ] Update any other files importing from `tools.ts`

#### Testing & Validation
- [ ] Run TypeScript compilation check
- [ ] Run full test suite
- [ ] Test each tool category manually
- [ ] Verify no functionality regressions
- [ ] Check import/export integrity

#### Cleanup
- [ ] Remove original `src/handlers/tools.ts`
- [ ] Update documentation/comments
- [ ] Commit changes with detailed message
- [ ] Merge to main branch

### Phase 2: Cache Monitor Refactoring

#### Pre-work
- [ ] Create feature branch `refactor/split-cache-monitor`
- [ ] Analyze current `cache-monitor.ts` responsibilities

#### Directory Structure Setup
- [ ] Create `src/cache/monitoring/` directory
- [ ] Create `src/cache/monitoring/cache-monitor.ts`
- [ ] Create `src/cache/monitoring/cleanup-manager.ts`
- [ ] Create `src/cache/monitoring/performance-analyzer.ts`
- [ ] Create `src/cache/monitoring/report-generator.ts`

#### Code Migration
- [ ] Extract cleanup logic to `cleanup-manager.ts`
  - [ ] `performAutoCleanup` method
  - [ ] `performLRUCleanup` method
  - [ ] `performSizeBasedCleanup` method
  - [ ] `performAgeBasedCleanup` method
  - [ ] `performPatternBasedCleanup` method
- [ ] Extract performance logic to `performance-analyzer.ts`
  - [ ] `collectMetrics` method
  - [ ] `analyzePerformance` method
  - [ ] `calculateOPS` method
  - [ ] `calculateAverageResponseTime` method
- [ ] Extract reporting logic to `report-generator.ts`
  - [ ] `generatePerformanceReport` method
  - [ ] `generateRecommendations` method
  - [ ] Report formatting utilities
- [ ] Refactor main `cache-monitor.ts` as orchestrator

#### Integration & Testing
- [ ] Update imports in files using `CacheMonitor`
- [ ] Run TypeScript compilation
- [ ] Test monitoring functionality
- [ ] Test cleanup operations
- [ ] Test report generation
- [ ] Verify performance metrics accuracy

#### Cleanup
- [ ] Remove original `cache-monitor.ts`
- [ ] Update export paths
- [ ] Commit and merge

### Phase 3: Analysis Files Refactoring

#### Project Outline Generator
- [ ] Create feature branch `refactor/split-analysis-files`
- [ ] Create `src/analysis/outline/` directory
- [ ] Create `src/analysis/outline/project-outline-generator.ts`
- [ ] Create `src/analysis/outline/directory-scanner.ts`
- [ ] Create `src/analysis/outline/file-analyzer.ts`
- [ ] Create `src/analysis/outline/outline-formatter.ts`
- [ ] Migrate directory traversal logic
- [ ] Migrate file type analysis
- [ ] Migrate output formatting
- [ ] Test project outline generation

#### File Summary Generator
- [ ] Create `src/analysis/summary/` directory
- [ ] Create `src/analysis/summary/file-summary-generator.ts`
- [ ] Create `src/analysis/summary/content-analyzer.ts`
- [ ] Create `src/analysis/summary/export-parser.ts`
- [ ] Create `src/analysis/summary/complexity-calculator.ts`
- [ ] Migrate content parsing logic
- [ ] Migrate export/import detection
- [ ] Migrate complexity calculations
- [ ] Test file summary generation

#### Integration & Testing
- [ ] Update imports in tools handlers
- [ ] Run full test suite
- [ ] Test analysis tool functionality
- [ ] Verify no regressions

### Phase 4: Large Cache Files Refactoring

#### Test Cache Split
- [ ] Create feature branch `refactor/split-cache-files`
- [ ] Create `src/cache/test/` directory
- [ ] Create `src/cache/test/test-cache.ts`
- [ ] Create `src/cache/test/test-runner.ts`
- [ ] Create `src/cache/test/result-parser.ts`
- [ ] Create `src/cache/test/test-discovery.ts`
- [ ] Migrate test execution logic
- [ ] Migrate result parsing
- [ ] Migrate test discovery
- [ ] Test cache operations

#### Lint Cache Split
- [ ] Create `src/cache/lint/` directory
- [ ] Create `src/cache/lint/lint-cache.ts`
- [ ] Create `src/cache/lint/linter-runner.ts`
- [ ] Create `src/cache/lint/result-processor.ts`
- [ ] Create `src/cache/lint/config-resolver.ts`
- [ ] Migrate ESLint execution
- [ ] Migrate result processing
- [ ] Migrate config resolution
- [ ] Test lint operations

#### Cached Resource Manager Split
- [ ] Create `src/cache/resources/` directory
- [ ] Create `src/cache/resources/cached-resource-manager.ts`
- [ ] Create `src/cache/resources/resource-generators.ts`
- [ ] Create `src/cache/resources/metadata-collector.ts`
- [ ] Create `src/cache/resources/cache-resource-builder.ts`
- [ ] Migrate resource generation logic
- [ ] Migrate metadata collection
- [ ] Migrate cache building
- [ ] Test resource management

#### Integration & Testing
- [ ] Update all imports
- [ ] Run TypeScript compilation
- [ ] Test cache functionality
- [ ] Test tool operations
- [ ] Verify no regressions

### Phase 5: Types Refactoring

#### Cache Types Split
- [ ] Create feature branch `refactor/split-types`
- [ ] Create `src/types/cache/` directory
- [ ] Create `src/types/cache/index.ts`
- [ ] Create `src/types/cache/interfaces.ts`
- [ ] Create `src/types/cache/monitoring.ts`
- [ ] Create `src/types/cache/operations.ts`
- [ ] Create `src/types/cache/resources.ts`
- [ ] Migrate core interfaces
- [ ] Migrate monitoring types
- [ ] Migrate operation types
- [ ] Migrate resource types

#### Integration & Testing
- [ ] Update all type imports across codebase
- [ ] Run TypeScript compilation
- [ ] Verify type safety maintained
- [ ] Test all functionality

### Final Validation & Cleanup

#### Complete Integration Test
- [ ] Run full test suite on final codebase
- [ ] Test all MCP server functionality
- [ ] Verify all tools work correctly
- [ ] Verify all resources work correctly
- [ ] Check memory usage and performance
- [ ] Validate against original functionality

#### Documentation & Cleanup
- [ ] Update README with new structure
- [ ] Update any architectural documentation
- [ ] Clean up any temporary files
- [ ] Update import paths in documentation
- [ ] Create final commit with summary

#### Success Validation
- [ ] All files under 200 lines ✅
- [ ] No functionality regressions ✅
- [ ] Improved test coverage (if applicable) ✅
- [ ] Maintained or improved performance ✅
- [ ] Clean Git history ✅

## IMPLEMENTATION EXECUTION PLAN

### CRITICAL RULES FOR IMPLEMENTATION:
1. **NO MODIFICATIONS** to original logic - only copy and move
2. **EXACT LINE COPYING** - preserve all whitespace, comments, logic
3. **IMPORTS MUST MATCH USAGE** - each file imports only what it uses
4. **SEQUENTIAL EXECUTION** - complete each step fully before next step
5. **IMMEDIATE TESTING** - test after each major step

### STEP-BY-STEP EXECUTION:

#### STEP 1: Directory Setup (2 minutes)
**Execute FIRST, do not continue until complete:**
```bash
mkdir -p src/handlers/tools
```

#### STEP 2: File Creation (5 minutes)
**Create exactly these 6 empty files:**
- `src/handlers/tools/project-state-tools.ts`
- `src/handlers/tools/package-tools.ts`
- `src/handlers/tools/file-tools.ts`
- `src/handlers/tools/dev-ops-tools.ts`
- `src/handlers/tools/analysis-tools.ts`
- `src/handlers/tools/cache-tools.ts`

#### STEP 3: Schema Extraction (20 minutes)
**For each file, copy EXACT schema objects from original tools.ts:**

**Do `project-state-tools.ts` first:**
1. Copy imports section (modified for this file's needs)
2. Copy exact schemas for: `get_project_status`, `refresh_changes`, `has_file_changed`
3. Create `export const projectStateTools: Tool[]` array
4. Test compilation: `npx tsc --noEmit src/handlers/tools/project-state-tools.ts`

**Then do remaining 5 files in same pattern**

#### STEP 4: Handler Extraction (45 minutes)
**For each file, copy EXACT handler implementations:**

**Do `project-state-tools.ts` first:**
1. Copy exact handler functions from `createToolHandlers`
2. Create `export function createProjectStateHandlers()` function
3. Test compilation

**Then do remaining 5 files in same pattern**

#### STEP 5: Index Creation (15 minutes)
**Create `src/handlers/tools/index.ts`:**
1. Import all tool arrays from 6 files
2. Merge into single `tools` array
3. Import all handler creator functions
4. Create unified `createToolHandlers` function
5. Export `registerToolHandlers` function

#### STEP 6: Main File Replacement (5 minutes)
**Replace `src/handlers/tools.ts` with:**
```typescript
// Re-export everything from the modular implementation
export { tools, createToolHandlers, registerToolHandlers } from './tools/index.js';
```

#### STEP 7: Integration Testing (10 minutes)
1. `npm run build` - MUST pass
2. `node test-phase2-tools.js` - MUST pass
3. `node test-phase3-tools.js` - MUST pass  
4. `node test-phase4-tools.js` - MUST pass

### TOTAL ESTIMATED TIME: 2 hours

### ROLLBACK PLAN:
If ANY step fails:
1. `git checkout src/handlers/tools.ts` - restore original
2. `rm -rf src/handlers/tools/` - remove new files
3. Debug issue before continuing
