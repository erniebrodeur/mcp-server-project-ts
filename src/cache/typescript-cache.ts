/**
 * TypeScript compilation result caching
 * Caches `tsc --noEmit` results until relevant files change
 */

import path from "node:path";
import { runCommand } from "../utils/process-utils.js";
import type { 
  TypeScriptCheckResult, 
  IFileMetadataService, 
  ICacheManager 
} from "../types/cache.js";
import { OperationCache } from "./operation-cache.js";

export class TypeScriptCache {
  private operationCache: OperationCache;

  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private workspaceRoot: string
  ) {
    this.operationCache = new OperationCache(cacheManager, fileMetadataService);
  }

  /**
   * Run TypeScript check and cache results
   */
  async checkTypeScript(): Promise<TypeScriptCheckResult> {
    const cacheKey = await this.generateCacheKey();
    
    // Try to get cached result first
    const cached = this.operationCache.getCachedOperation('typescript', cacheKey);
    if (cached && await this.operationCache.validateCachedOperation(cached)) {
      return cached as TypeScriptCheckResult;
    }

    // Run TypeScript check
    
    // Run TypeScript check
    const result = await this.runTypeScriptCheck();
    
    // Cache the result
    this.operationCache.cacheOperation('typescript', cacheKey, result);
    
    return result;
  }

  /**
   * Get cached TypeScript check result without running check
   */
  async getCachedResult(): Promise<TypeScriptCheckResult | undefined> {
    const cacheKey = await this.generateCacheKey();
    const cached = this.operationCache.getCachedOperation('typescript', cacheKey);
    
    if (cached && await this.operationCache.validateCachedOperation(cached)) {
      return cached as TypeScriptCheckResult;
    }
    
    return undefined;
  }

  /**
   * Clear TypeScript check cache
   */
  clearCache(): number {
    return this.operationCache.clearOperationType('typescript');
  }

  /**
   * Run actual TypeScript check using tsc --noEmit
   */
  private async runTypeScriptCheck(): Promise<TypeScriptCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await runCommand('npx', ['tsc', '--noEmit'], { 
        cwd: this.workspaceRoot 
      });
      
      const diagnostics = this.parseTypeScriptOutput(result.output || result.error || '');
      const fileHashes = await this.getRelevantFileHashes();
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        timestamp: new Date(),
        fileHashes,
        diagnostics
      };
    } catch (error: any) {
      const fileHashes = await this.getRelevantFileHashes();
      
      return {
        success: false,
        output: '',
        error: error.message,
        timestamp: new Date(),
        fileHashes,
        diagnostics: [{
          message: `TypeScript check failed: ${error.message}`,
          category: 'error'
        }]
      };
    }
  }

  /**
   * Parse TypeScript compiler output into structured diagnostics
   */
  private parseTypeScriptOutput(output: string): TypeScriptCheckResult['diagnostics'] {
    const diagnostics: TypeScriptCheckResult['diagnostics'] = [];
    
    if (!output.trim()) {
      return diagnostics;
    }
    
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse TypeScript error format: filename(line,col): error/warning TS####: message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS\d+:\s+(.+)$/);
      
      if (match) {
        const [, file, lineNum, colNum, category, message] = match;
        diagnostics.push({
          file: path.relative(this.workspaceRoot, file),
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          message: message.trim(),
          category: category as 'error' | 'warning' | 'info'
        });
      } else if (line.trim() && !line.includes('Found ') && !line.includes('Watching for file changes')) {
        // Generic error line
        diagnostics.push({
          message: line.trim(),
          category: 'error'
        });
      }
    }
    
    return diagnostics;
  }

  /**
   * Generate cache key based on TypeScript files and config
   */
  private async generateCacheKey(): Promise<string> {
    const tsFiles = await this.getTypeScriptFiles();
    const configFiles = await this.getConfigFiles();
    
    return this.operationCache.generateFileBasedKey(tsFiles, configFiles);
  }

  /**
   * Get all TypeScript files in the project
   */
  private async getTypeScriptFiles(): Promise<string[]> {
    // For now, use a simple pattern - in a real implementation,
    // we'd use fast-glob or read tsconfig.json to get exact files
    const glob = await import('fast-glob');
    
    return await glob.default([
      '**/*.ts',
      '**/*.tsx',
      '!node_modules/**',
      '!dist/**',
      '!build/**'
    ], {
      cwd: this.workspaceRoot,
      absolute: true
    });
  }

  /**
   * Get configuration files that affect TypeScript compilation
   */
  private async getConfigFiles(): Promise<string[]> {
    const configFiles = [
      'tsconfig.json',
      'tsconfig.build.json',
      'tsconfig.dev.json',
      'package.json'
    ];
    
    const existingFiles: string[] = [];
    
    for (const configFile of configFiles) {
      const fullPath = path.join(this.workspaceRoot, configFile);
      const metadata = await this.fileMetadataService.getMetadata(fullPath);
      if (metadata.exists) {
        existingFiles.push(fullPath);
      }
    }
    
    return existingFiles;
  }

  /**
   * Get file hashes for all relevant files
   */
  private async getRelevantFileHashes(): Promise<Record<string, string>> {
    const tsFiles = await this.getTypeScriptFiles();
    const configFiles = await this.getConfigFiles();
    const allFiles = [...tsFiles, ...configFiles];
    
    const hashes: Record<string, string> = {};
    
    for (const filePath of allFiles) {
      try {
        const hash = await this.fileMetadataService.calculateHash(filePath);
        hashes[filePath] = hash;
      } catch (error) {
        console.warn(`Failed to calculate hash for ${filePath}:`, error);
      }
    }
    
    return hashes;
  }

  /**
   * Get statistics about TypeScript cache usage
   */
  getStats() {
    return this.operationCache.getOperationStats('typescript');
  }
}
