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
   * Try different test runners with better detection
   */
  private async tryTestRunners(testPattern?: string) {
    // Check package.json for available test commands first
    const hasTestScript = await this.hasTestScript();
    const availableRunners = await this.detectAvailableRunners();
    
    const testCommands = [];
    
    // Prefer package.json test script if available
    if (hasTestScript) {
      testCommands.push({
        cmd: 'npm',
        args: ['test', ...(testPattern ? ['--', '--testPathPattern', testPattern] : [])],
        name: 'npm test'
      });
    }
    
    // Add detected runners
    for (const runner of availableRunners) {
      testCommands.push(runner);
    }
    
    // Fallback runners
    testCommands.push(
      {
        cmd: 'npx',
        args: ['jest', '--passWithNoTests', ...(testPattern ? ['--testPathPattern', testPattern] : [])],
        name: 'jest'
      },
      {
        cmd: 'npx', 
        args: ['vitest', 'run', ...(testPattern ? ['--reporter=verbose'] : [])],
        name: 'vitest'
      },
      {
        cmd: 'npx',
        args: ['mocha', ...(testPattern ? [testPattern] : ['test/**/*.{js,ts}'])],
        name: 'mocha'
      }
    );

    let lastError = '';
    
    for (const { cmd, args, name } of testCommands) {
      try {
        const result = await runCommand(cmd, args, { 
          cwd: this.workspaceRoot
        });
        
        // Success or test failures (but command worked)
        if (result.success || this.looksLikeTestOutput(result.output || result.error || '')) {
          return result;
        }
        
        lastError = result.error || 'Unknown error';
      } catch (error: any) {
        lastError = error.message;
        // Continue to next runner
        continue;
      }
    }

    // If we get here, no test runner worked
    throw new Error(`No working test runner found. Last error: ${lastError}`);
  }

  /**
   * Parse test output to extract basic statistics (simplified)
   */
  private parseTestOutput(output: string): {
    passed: number;
    failed: number;
    skipped: number;
    testFiles: string[];
  } {
    const result = { passed: 0, failed: 0, skipped: 0, testFiles: [] as string[] };

    if (!output) {
      return result;
    }

    // Extract numbers using simple patterns
    const numbers = output.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];
    
    // Look for common test result patterns
    const passedMatch = output.match(/(\d+)\s+(?:passed|passing|✓|√)/i);
    const failedMatch = output.match(/(\d+)\s+(?:failed|failing|✗|×)/i);
    const skippedMatch = output.match(/(\d+)\s+(?:skipped|pending)/i);
    
    if (passedMatch) result.passed = parseInt(passedMatch[1], 10);
    if (failedMatch) result.failed = parseInt(failedMatch[1], 10);
    if (skippedMatch) result.skipped = parseInt(skippedMatch[1], 10);
    
    // If no specific patterns found but we have numbers, make reasonable guesses
    if (result.passed === 0 && result.failed === 0 && numbers.length > 0) {
      // Look for Jest-style "Tests: X failed, Y passed"
      const jestMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/);
      if (jestMatch) {
        result.failed = parseInt(jestMatch[1], 10);
        result.passed = parseInt(jestMatch[2], 10);
      } else if (numbers.length >= 2) {
        // Simple heuristic: if tests ran, assume first number is passed, second is total or failed
        result.passed = numbers[0];
        if (output.includes('fail')) {
          result.failed = numbers[1];
        }
      }
    }
    
    // Extract test file names (simple pattern)
    const fileMatches = output.match(/([^/\s]+\.(?:test|spec)\.(?:js|ts|jsx|tsx))/g);
    if (fileMatches) {
      result.testFiles = [...new Set(fileMatches)]; // Remove duplicates
    }

    return result;
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

  /**
   * Check if package.json has a test script
   */
  private async hasTestScript(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      const metadata = await this.fileMetadataService.getMetadata(packageJsonPath);
      if (!metadata.exists) return false;
      
      const { readFile } = await import('node:fs/promises');
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.scripts && pkg.scripts.test;
    } catch {
      return false;
    }
  }

  /**
   * Detect available test runners
   */
  private async detectAvailableRunners(): Promise<Array<{cmd: string, args: string[], name: string}>> {
    const runners = [];
    
    // Check for config files to determine available runners
    const configChecks = [
      { file: 'jest.config.js', runner: 'jest' },
      { file: 'jest.config.json', runner: 'jest' },
      { file: 'vitest.config.js', runner: 'vitest' },
      { file: 'vitest.config.ts', runner: 'vitest' },
      { file: '.mocharc.json', runner: 'mocha' },
      { file: '.mocharc.js', runner: 'mocha' }
    ];
    
    for (const { file, runner } of configChecks) {
      const configPath = path.join(this.workspaceRoot, file);
      const metadata = await this.fileMetadataService.getMetadata(configPath);
      if (metadata.exists) {
        if (runner === 'jest') {
          runners.push({
            cmd: 'npx',
            args: ['jest', '--passWithNoTests'],
            name: 'jest (detected config)'
          });
        } else if (runner === 'vitest') {
          runners.push({
            cmd: 'npx',
            args: ['vitest', 'run'],
            name: 'vitest (detected config)'
          });
        } else if (runner === 'mocha') {
          runners.push({
            cmd: 'npx',
            args: ['mocha'],
            name: 'mocha (detected config)'
          });
        }
      }
    }
    
    return runners;
  }

  /**
   * Check if output looks like test results (simple heuristic)
   */
  private looksLikeTestOutput(output: string): boolean {
    const testIndicators = [
      /\d+\s+(passing|failed|skipped)/i,
      /Tests:\s+\d+/i,
      /Test Suites:/i,
      /✓|✗|√|×/,
      /PASS|FAIL/i,
      /describe|it\s*\(/
    ];
    
    return testIndicators.some(pattern => pattern.test(output));
  }
}
