/**
 * Test results caching
 * Caches test results and tracks which tests depend on which source files
 */

import path from "node:path";
import { runCommand } from "../utils/process-utils.js";
import type { 
  TestResult, 
  IFileMetadataService, 
  ICacheManager 
} from "../types/cache.js";
import { OperationCache } from "./operation-cache.js";

export class TestCache {
  private operationCache: OperationCache;

  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private workspaceRoot: string
  ) {
    this.operationCache = new OperationCache(cacheManager, fileMetadataService);
  }

  /**
   * Run tests and cache results
   */
  async runTests(testPattern?: string): Promise<TestResult> {
    const cacheKey = await this.generateCacheKey(testPattern);
    
    // Try to get cached result first
    const cached = this.operationCache.getCachedOperation('test', cacheKey);
    if (cached && await this.operationCache.validateCachedOperation(cached)) {
      return cached as TestResult;
    }

    // Run tests
    
    // Run tests
    const result = await this.runTestSuite(testPattern);
    
    // Cache the result
    this.operationCache.cacheOperation('test', cacheKey, result);
    
    return result;
  }

  /**
   * Get cached test results without running tests
   */
  async getCachedResult(testPattern?: string): Promise<TestResult | undefined> {
    const cacheKey = await this.generateCacheKey(testPattern);
    const cached = this.operationCache.getCachedOperation('test', cacheKey);
    
    if (cached && await this.operationCache.validateCachedOperation(cached)) {
      return cached as TestResult;
    }
    
    return undefined;
  }

  /**
   * Run tests that may be affected by specific file changes
   */
  async runAffectedTests(changedFiles: string[]): Promise<TestResult> {
    // For now, run all tests when any file changes
    // In a more sophisticated implementation, we'd analyze dependencies
    // to determine which tests actually need to be re-run
    const affectedTestFiles = await this.findAffectedTestFiles(changedFiles);
    
    if (affectedTestFiles.length === 0) {
      // No tests affected, return cached results if available
      const cached = await this.getCachedResult();
      if (cached) {
        // Using cached results for unchanged tests
        return cached;
      }
    }
    
    // Running affected test files
    return await this.runTests(affectedTestFiles.join('|'));
  }

  /**
   * Clear test cache
   */
  clearCache(): number {
    return this.operationCache.clearOperationType('test');
  }

  /**
   * Run actual test suite
   */
  private async runTestSuite(testPattern?: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Try different test runners in order of preference
      const result = await this.tryTestRunners(testPattern);
      const duration = Date.now() - startTime;
      
      const { passed, failed, skipped, testFiles } = this.parseTestOutput(result.output || '');
      const fileHashes = await this.getRelevantFileHashes();
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        timestamp: new Date(),
        fileHashes,
        testFiles,
        passed,
        failed,
        skipped,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const fileHashes = await this.getRelevantFileHashes();
      
      return {
        success: false,
        output: '',
        error: error.message,
        timestamp: new Date(),
        fileHashes,
        testFiles: [],
        passed: 0,
        failed: 1,
        skipped: 0,
        duration
      };
    }
  }

  /**
   * Try different test runners
   */
  private async tryTestRunners(testPattern?: string) {
    const testCommands = [
      // Jest
      {
        cmd: 'npx',
        args: ['jest', ...(testPattern ? ['--testPathPattern', testPattern] : []), '--passWithNoTests']
      },
      // npm test
      {
        cmd: 'npm',
        args: ['test']
      },
      // Vitest
      {
        cmd: 'npx',
        args: ['vitest', 'run', ...(testPattern ? ['--reporter=verbose'] : [])]
      },
      // Mocha
      {
        cmd: 'npx',
        args: ['mocha', ...(testPattern ? [testPattern] : ['test/**/*.{js,ts}'])]
      }
    ];

    for (const { cmd, args } of testCommands) {
      try {
        const result = await runCommand(cmd, args, { cwd: this.workspaceRoot });
        
        // If command succeeded or failed with test results (not command not found)
        if (result.success || (result.error && !result.error.includes('command not found'))) {
          return result;
        }
      } catch (error) {
        // Continue to next test runner
        continue;
      }
    }

    throw new Error('No supported test runner found (tried: jest, npm test, vitest, mocha)');
  }

  /**
   * Parse test output to extract statistics
   */
  private parseTestOutput(output: string): {
    passed: number;
    failed: number;
    skipped: number;
    testFiles: string[];
  } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const testFiles: string[] = [];

    if (!output) {
      return { passed, failed, skipped, testFiles };
    }

    const lines = output.split('\n');

    for (const line of lines) {
      // Jest format
      const jestMatch = line.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/);
      if (jestMatch) {
        failed = parseInt(jestMatch[1], 10);
        passed = parseInt(jestMatch[2], 10);
        continue;
      }

      // Alternative Jest format
      const jestMatch2 = line.match(/(\d+)\s+passed,\s+(\d+)\s+total/);
      if (jestMatch2) {
        passed = parseInt(jestMatch2[1], 10);
        continue;
      }

      // Mocha format
      const mochaMatch = line.match(/(\d+)\s+passing.*?(\d+)\s+failing/);
      if (mochaMatch) {
        passed = parseInt(mochaMatch[1], 10);
        failed = parseInt(mochaMatch[2], 10);
        continue;
      }

      // Extract test file names
      const fileMatch = line.match(/([^/\s]+\.(?:test|spec)\.(?:js|ts|jsx|tsx))/);
      if (fileMatch && !testFiles.includes(fileMatch[1])) {
        testFiles.push(fileMatch[1]);
      }
    }

    return { passed, failed, skipped, testFiles };
  }

  /**
   * Find test files that might be affected by source file changes
   */
  private async findAffectedTestFiles(changedFiles: string[]): Promise<string[]> {
    const allTestFiles = await this.getTestFiles();
    const affectedTests: string[] = [];

    for (const testFile of allTestFiles) {
      for (const changedFile of changedFiles) {
        // Simple heuristic: if test file name matches source file name, consider it affected
        const testBaseName = path.basename(testFile, path.extname(testFile))
          .replace(/\.(test|spec)$/, '');
        const sourceBaseName = path.basename(changedFile, path.extname(changedFile));
        
        if (testBaseName === sourceBaseName || testFile.includes(sourceBaseName)) {
          affectedTests.push(testFile);
          break;
        }
      }
    }

    // If no specific tests found, assume all tests might be affected
    // In a real implementation, we'd use AST analysis or import tracking
    return affectedTests.length > 0 ? affectedTests : allTestFiles;
  }

  /**
   * Generate cache key based on test files and config
   */
  private async generateCacheKey(testPattern?: string): Promise<string> {
    const testFiles = await this.getTestFiles();
    const configFiles = await this.getConfigFiles();
    const sourceFiles = await this.getSourceFiles();
    
    // Include all relevant files in cache key
    const keyFiles = [...testFiles, ...configFiles, ...sourceFiles.slice(0, 50)]; // Limit source files
    const baseKey = this.operationCache.generateFileBasedKey(keyFiles);
    
    return testPattern ? `${baseKey}:${testPattern}` : baseKey;
  }

  /**
   * Get all test files in the project
   */
  private async getTestFiles(): Promise<string[]> {
    const glob = await import('fast-glob');
    
    return await glob.default([
      '**/*.test.{js,ts,jsx,tsx}',
      '**/*.spec.{js,ts,jsx,tsx}',
      '**/test/**/*.{js,ts,jsx,tsx}',
      '**/tests/**/*.{js,ts,jsx,tsx}',
      '!node_modules/**'
    ], {
      cwd: this.workspaceRoot,
      absolute: true
    });
  }

  /**
   * Get source files that might affect tests
   */
  private async getSourceFiles(): Promise<string[]> {
    const glob = await import('fast-glob');
    
    return await glob.default([
      '**/*.{js,ts,jsx,tsx}',
      '!**/*.test.{js,ts,jsx,tsx}',
      '!**/*.spec.{js,ts,jsx,tsx}',
      '!node_modules/**',
      '!dist/**',
      '!build/**'
    ], {
      cwd: this.workspaceRoot,
      absolute: true
    });
  }

  /**
   * Get test configuration files
   */
  private async getConfigFiles(): Promise<string[]> {
    const configFiles = [
      'jest.config.js',
      'jest.config.json',
      'vitest.config.js',
      'vitest.config.ts',
      '.mocharc.json',
      '.mocharc.js',
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
    const testFiles = await this.getTestFiles();
    const configFiles = await this.getConfigFiles();
    const sourceFiles = await this.getSourceFiles();
    
    // Limit the number of source files to avoid excessive cache invalidation
    const limitedSourceFiles = sourceFiles.slice(0, 100);
    const allFiles = [...testFiles, ...configFiles, ...limitedSourceFiles];
    
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
   * Get statistics about test cache usage
   */
  getStats() {
    return this.operationCache.getOperationStats('test');
  }
}
