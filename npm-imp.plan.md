# NPM Support Enhancement Plan

## Current State
- Basic `install_dependency` and `uninstall_dependency` MCP tools  
- Simple `NpmManager` class with install/uninstall operations
- Dependencies listed in `get_project_status`

## Missing NPM Operations
- Update dependencies
- Check for outdated packages  
- Run npm scripts
- Security audit

## Proposed Additions

### 1. Dependency Updates
- `update_dependency` - Update specific package to latest compatible version
- `check_outdated` - List packages with newer versions available

### 2. Script Execution  
- `run_npm_script` - Execute package.json scripts
- `list_scripts` - Show available scripts

### 3. Security
- `npm_audit` - Check for security vulnerabilities

## Implementation

### Extend INpmManager interface
Add methods for update, outdated, scripts, and audit operations

### Add new MCP tools
- Follow existing pattern in `package-tools.ts` 
- Add proper JSON schemas for each tool
- Handle errors consistently with current tools

### Extend NpmManager class  
Add the actual npm command execution for new operations

## Design Decisions
- Script execution will have streaming output for real-time feedback
- No limits on which scripts can be executed (full npm script access)
- Audit failures will not block other operations (informational only)

## Implementation Steps

### Step 1: Extend Types and Interfaces
- [x] Add new methods to `INpmManager` interface in `src/types/index.ts`
  - [x] `update(packageName: string): Promise<DependencyOperation>`
  - [x] `checkOutdated(): Promise<DependencyOperation>`
  - [x] `runScript(scriptName: string): Promise<DependencyOperation>`
  - [x] `listScripts(): Promise<DependencyOperation>`
  - [x] `audit(): Promise<DependencyOperation>`

### Step 2: Implement NpmManager Methods
- [x] Extend `src/dependencies/npm-manager.ts` with new methods
  - [x] Add `update()` method - runs `npm update <package>`
  - [x] Add `checkOutdated()` method - runs `npm outdated --json`
  - [x] Add `runScript()` method - runs `npm run <script>` with streaming
  - [x] Add `listScripts()` method - reads package.json scripts section
  - [x] Add `audit()` method - runs `npm audit --json`
  - [x] Handle streaming output for `runScript()` method

### Step 3: Create New MCP Tools
- [x] Add new tools to `src/handlers/tools/package-tools.ts`
  - [x] `update_dependency` tool with JSON schema
  - [x] `check_outdated` tool with JSON schema
  - [x] `run_npm_script` tool with JSON schema
  - [x] `list_scripts` tool with JSON schema
  - [x] `npm_audit` tool with JSON schema

### Step 4: Create Tool Handlers
- [x] Add handlers in `createPackageHandlers()` function
  - [x] `update_dependency` handler
  - [x] `check_outdated` handler
  - [x] `run_npm_script` handler
  - [x] `list_scripts` handler
  - [x] `npm_audit` handler
  - [x] Ensure consistent error handling across all handlers

### Step 5: Testing
- [x] Model after the phase tests (test-phase2-tools.js, test-phase3-tools.js, etc.)

### Step 6: Documentation
- [x] Update README.md with new tool descriptions
- [x] Add usage examples for each new tool

---

*Simple extension of existing npm functionality - no major architectural changes needed.*
