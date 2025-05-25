/**
 * Lint results caching
 * Caches ESLint results per file with smart invalidation
 */

import path from "node:path";
import { runCommand } from "../utils/process-utils.js";
import type { 
  LintResult, 
  IFileMetadataService, 
  ICacheManager 
} from "../types/cache.js";
import { OperationCache } from "./operation-cache.js";

export class LintCache {
  private operationCache: OperationCache;

  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private workspaceRoot: string
  ) {
    this.operationCache = new OperationCache(cacheManager, fileMetadataService);
  }

  /**
   * Lint specific files and cache results
   */
  async lintFiles(filePaths: string[]): Promise<LintResult[]> {
    const results: LintResult[] = [];
    
    for (const filePath of filePaths) {
      const result = await this.lintSingleFile(filePath);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Lint a single file with caching
   */
  async lintSingleFile(filePath: string): Promise<LintResult> {
    const absolutePath = path.resolve(this.workspaceRoot, filePath);
    const cacheKey = await this.generateFileKey(absolutePath);
    
    // Try to get cached result first
    const cached = this.operationCache.getCachedOperation('lint', cacheKey);
    if (cached && await this.operationCache.validateCachedOperation(cached)) {
      return cached as LintResult;
    }

    // Run lint check
    
    // Run lint check
    const result = await this.runLintCheck(absolutePath);
    
    // Cache the result
    this.operationCache.cacheOperation('lint', cacheKey, result);
    
    return result;
  }

  /**
   * Lint all lintable files in the project
   */
  async lintProject(): Promise<LintResult[]> {
    const lintableFiles = await this.getLintableFiles();
    return await this.lintFiles(lintableFiles.map(f => path.relative(this.workspaceRoot, f)));
  }

  /**
   * Get cached lint results for specific files
   */
  async getCachedResults(filePaths: string[]): Promise<(LintResult | undefined)[]> {
    const results: (LintResult | undefined)[] = [];
    
    for (const filePath of filePaths) {
      const absolutePath = path.resolve(this.workspaceRoot, filePath);
      const cacheKey = await this.generateFileKey(absolutePath);
      const cached = this.operationCache.getCachedOperation('lint', cacheKey);
      
      if (cached && await this.operationCache.validateCachedOperation(cached)) {
        results.push(cached as LintResult);
      } else {
        results.push(undefined);
      }
    }
    
    return results;
  }

  /**
   * Clear lint cache for specific files or all
   */
  clearCache(filePaths?: string[]): number {
    if (!filePaths) {
      return this.operationCache.clearOperationType('lint');
    }
    
    let cleared = 0;
    for (const filePath of filePaths) {
      const absolutePath = path.resolve(this.workspaceRoot, filePath);
      const cacheKey = this.generateFileCacheKey(absolutePath);
      const fullCacheKey = this.cacheManager.generateKey('operation', 'lint', cacheKey);
      cleared += this.cacheManager.del(fullCacheKey);
    }
    
    return cleared;
  }

  /**
   * Run actual lint check using ESLint
   */
  private async runLintCheck(filePath: string): Promise<LintResult> {
    try {
      // Use ESLint with JSON output for parsing
      const result = await runCommand('npx', ['eslint', '--format', 'json', filePath], { 
        cwd: this.workspaceRoot 
      });
      
      const issues = this.parseESLintOutput(result.output || '');
      const fileHashes = await this.getFileHashes([filePath]);
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        timestamp: new Date(),
        fileHashes,
        filePath: path.relative(this.workspaceRoot, filePath),
        issues
      };
    } catch (error: any) {
      const fileHashes = await this.getFileHashes([filePath]);
      
      return {
        success: false,
        output: '',
        error: error.message,
        timestamp: new Date(),
        fileHashes,
        filePath: path.relative(this.workspaceRoot, filePath),
        issues: [{
          line: 1,
          column: 1,
          rule: 'lint-error',
          message: `Lint check failed: ${error.message}`,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Parse ESLint JSON output into structured issues
   */
  private parseESLintOutput(output: string): LintResult['issues'] {
    const issues: LintResult['issues'] = [];
    
    if (!output.trim()) {
      return issues;
    }
    
    try {
      const eslintResults = JSON.parse(output);
      
      if (Array.isArray(eslintResults)) {
        for (const fileResult of eslintResults) {
          if (fileResult.messages && Array.isArray(fileResult.messages)) {
            for (const message of fileResult.messages) {
              issues.push({
                line: message.line || 1,
                column: message.column || 1,
                rule: message.ruleId || 'unknown',
                message: message.message || 'Unknown lint issue',
                severity: this.mapSeverity(message.severity)
              });
            }
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, treat as a generic error
      console.warn('Failed to parse ESLint output as JSON:', error);
      
      if (output.includes('error') || output.includes('Error')) {
        issues.push({
          line: 1,
          column: 1,
          rule: 'parse-error',
          message: output.trim(),
          severity: 'error'
        });
      }
    }
    
    return issues;
  }

  /**
   * Map ESLint severity to our format
   */
  private mapSeverity(severity: number): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 2:
        return 'error';
      case 1:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Generate cache key for a file
   */
  private async generateFileKey(filePath: string): Promise<string> {
    return this.generateFileCacheKey(filePath);
  }

  /**
   * Generate simple cache key based on file path
   */
  private generateFileCacheKey(filePath: string): string {
    return path.relative(this.workspaceRoot, filePath).replace(/[/\\]/g, ':');
  }

  /**
   * Get all lintable files in the project
   */
  private async getLintableFiles(): Promise<string[]> {
    const glob = await import('fast-glob');
    
    return await glob.default([
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '!node_modules/**',
      '!dist/**',
      '!build/**',
      '!coverage/**'
    ], {
      cwd: this.workspaceRoot,
      absolute: true
    });
  }

  /**
   * Get file hashes for given files plus config files
   */
  private async getFileHashes(filePaths: string[]): Promise<Record<string, string>> {
    const configFiles = await this.getConfigFiles();
    const allFiles = [...filePaths, ...configFiles];
    
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
   * Get ESLint configuration files
   */
  private async getConfigFiles(): Promise<string[]> {
    const configFiles = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
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
   * Get statistics about lint cache usage
   */
  getStats() {
    return this.operationCache.getOperationStats('lint');
  }
}
