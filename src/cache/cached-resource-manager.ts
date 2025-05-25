/**
 * Cached Resource Manager
 * Handles generation and management of cache-based resources
 */

import crypto from "node:crypto";
import type { 
  ICachedResourceManager,
  CachedResourceData,
  MetadataResource,
  ProjectStructureResource,
  CacheResourceSummary,
  ICacheManager,
  IFileMetadataService,
  ProjectOutline,
  FileSummary
} from "../types/cache.js";
import { TypeScriptCache } from "../cache/typescript-cache.js";
import { LintCache } from "../cache/lint-cache.js";
import { TestCache } from "../cache/test-cache.js";
import { ProjectOutlineGenerator } from "../analysis/project-outline.js";
import { FileSummaryGenerator } from "../analysis/file-summary.js";

export class CachedResourceManager implements ICachedResourceManager {
  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private typescriptCache: TypeScriptCache,
    private lintCache: LintCache,
    private testCache: TestCache,
    private projectOutlineGenerator: ProjectOutlineGenerator,
    private fileSummaryGenerator: FileSummaryGenerator,
    private workspaceRoot: string
  ) {}

  /**
   * Generate a cache resource for typescript, lint, or test results
   */
  async generateCacheResource(cacheType: 'typescript' | 'lint' | 'test'): Promise<CachedResourceData | null> {
    const cacheKey = this.generateResourceCacheKey(cacheType);
    let data: any = null;
    let lastUpdated: Date = new Date();

    switch (cacheType) {
      case 'typescript':
        data = await this.typescriptCache.getCachedResult();
        break;
      case 'lint':
        // For lint, we need to get results for common files or return empty array
        const lintableFiles = await this.getLintableFiles();
        const sampleFiles = lintableFiles.slice(0, 10); // Sample first 10 files for resource
        const relativePaths = sampleFiles.map((f: string) => 
          f.replace(this.workspaceRoot + '/', '')
        );
        data = await this.lintCache.getCachedResults(relativePaths);
        data = data.filter((result: any) => result !== undefined);
        break;
      case 'test':
        data = await this.testCache.getCachedResult();
        break;
    }

    if (!data) {
      return null; // No cached data available
    }

    // Extract timestamp from data if available
    if (data.timestamp) {
      lastUpdated = new Date(data.timestamp);
    } else if (Array.isArray(data) && data.length > 0 && data[0].timestamp) {
      lastUpdated = new Date(data[0].timestamp);
    }

    const version = this.generateVersion(lastUpdated, cacheType);

    return {
      uri: `cache://${cacheType}-results`,
      lastUpdated,
      cacheKey,
      version,
      data
    };
  }

  /**
   * Generate metadata resources (file-hashes or project-structure)
   */
  async generateMetadataResource(resourceType: 'file-hashes' | 'project-structure'): Promise<CachedResourceData> {
    const cacheKey = this.generateResourceCacheKey(resourceType);
    let data: any;
    const lastUpdated = new Date();

    if (resourceType === 'file-hashes') {
      data = await this.generateFileHashesResource();
    } else {
      data = await this.generateProjectStructureResource();
    }

    const version = this.generateVersion(lastUpdated, resourceType);

    return {
      uri: `metadata://${resourceType}`,
      lastUpdated,
      cacheKey,
      version,
      data
    };
  }

  /**
   * Generate file hashes metadata resource
   */
  private async generateFileHashesResource(): Promise<MetadataResource> {
    // Get all TypeScript/JavaScript files for hashing
    const projectOutline = await this.projectOutlineGenerator.getProjectOutline();
    const files: Record<string, any> = {};
    let totalFiles = 0;

    const collectFiles = (node: any) => {
      if (node.type === 'file') {
        const shouldInclude = node.fileType && 
          ['typescript', 'javascript', 'tsx', 'jsx', 'config', 'data'].includes(node.fileType);
        
        if (shouldInclude) {
          files[node.path] = {
            hash: '', // Will be filled by metadata service
            size: node.size || 0,
            lastModified: new Date(),
            path: node.path
          };
          totalFiles++;
        }
      }
      
      if (node.children) {
        node.children.forEach(collectFiles);
      }
    };

    collectFiles(projectOutline.structure);

    // Get actual metadata for these files
    const filePaths = Object.keys(files);
    try {
      const metadataBatch = await this.fileMetadataService.getMetadataBatch(filePaths);
      
      metadataBatch.forEach(metadata => {
        if (metadata.exists && files[metadata.path]) {
          files[metadata.path] = {
            hash: metadata.contentHash,
            size: metadata.size,
            lastModified: metadata.lastModified,
            path: metadata.path
          };
        }
      });
    } catch (error) {
      console.warn('Failed to get metadata batch for file hashes resource:', error);
    }

    return {
      files,
      lastUpdated: new Date(),
      totalFiles
    };
  }

  /**
   * Generate project structure metadata resource
   */
  private async generateProjectStructureResource(): Promise<ProjectStructureResource> {
    const outline = await this.projectOutlineGenerator.getProjectOutline({
      maxDepth: 3,
      includeSizes: true
    });

    return {
      structure: outline.structure,
      stats: outline.stats,
      lastUpdated: new Date(),
      version: this.generateVersion(outline.timestamp, 'structure')
    };
  }

  /**
   * Get version string for a resource
   */
  getResourceVersion(resourceUri: string): string {
    const cacheKey = this.generateResourceCacheKey(resourceUri);
    const cached = this.cacheManager.get<CachedResourceData>(cacheKey);
    return cached?.version || 'unknown';
  }

  /**
   * Check if a resource is stale
   */
  async isResourceStale(resourceUri: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
    const cacheKey = this.generateResourceCacheKey(resourceUri);
    const cached = this.cacheManager.get<CachedResourceData>(cacheKey);
    
    if (!cached) {
      return true; // No cached version, considered stale
    }

    const age = Date.now() - cached.lastUpdated.getTime();
    return age > maxAge;
  }

  /**
   * Get summary of all cache resources
   */
  async getCacheResourceSummary(): Promise<CacheResourceSummary> {
    const summary: CacheResourceSummary = {};

    // TypeScript cache summary
    const tsData = await this.typescriptCache.getCachedResult();
    if (tsData) {
      summary.typescript = {
        lastRun: new Date(tsData.timestamp),
        success: tsData.success,
        issueCount: tsData.diagnostics?.length || 0,
        version: this.generateVersion(new Date(tsData.timestamp), 'typescript')
      };
    }

    // Lint cache summary
    // Get a sample of lint results since there's no getAllCachedResults method
    const lintableFiles = await this.getLintableFiles();
    const sampleFiles = lintableFiles.slice(0, 5).map((f: string) => 
      f.replace(this.workspaceRoot + '/', '')
    );
    const lintData = await this.lintCache.getCachedResults(sampleFiles);
    const validLintData = lintData.filter((result: any) => result !== undefined);
    
    if (validLintData && validLintData.length > 0) {
      const totalIssues = validLintData.reduce((sum: number, result: any) => sum + (result.issues?.length || 0), 0);
      const latestRun = validLintData.reduce((latest: Date, result: any) => {
        const timestamp = new Date(result.timestamp);
        return timestamp > latest ? timestamp : latest;
      }, new Date(0));

      summary.lint = {
        lastRun: latestRun,
        totalFiles: validLintData.length,
        issuesCount: totalIssues,
        version: this.generateVersion(latestRun, 'lint')
      };
    }

    // Test cache summary
    const testData = await this.testCache.getCachedResult();
    if (testData) {
      summary.test = {
        lastRun: new Date(testData.timestamp),
        totalTests: testData.passed + testData.failed + testData.skipped,
        passed: testData.passed,
        failed: testData.failed,
        version: this.generateVersion(new Date(testData.timestamp), 'test')
      };
    }

    return summary;
  }

  /**
   * Generate cache key for resource
   */
  private generateResourceCacheKey(identifier: string): string {
    return this.cacheManager.generateKey('resource', identifier);
  }

  /**
   * Generate version string based on timestamp and type
   */
  private generateVersion(timestamp: Date, type: string): string {
    const hash = crypto.createHash('md5')
      .update(`${timestamp.getTime()}-${type}`)
      .digest('hex')
      .substring(0, 8);
    return `${type}-${hash}`;
  }

  /**
   * Cache a resource for future access
   */
  cacheResource(resourceData: CachedResourceData): void {
    this.cacheManager.setWithOperationTTL(resourceData.cacheKey, resourceData, 'metadata');
  }

  /**
   * Get cached resource if available
   */
  getCachedResource(resourceUri: string): CachedResourceData | null {
    const cacheKey = this.generateResourceCacheKey(resourceUri);
    return this.cacheManager.get<CachedResourceData>(cacheKey) || null;
  }

  /**
   * Clear resource cache
   */
  clearResourceCache(resourceUri?: string): number {
    if (resourceUri) {
      const cacheKey = this.generateResourceCacheKey(resourceUri);
      return this.cacheManager.del(cacheKey);
    } else {
      const pattern = new RegExp('^resource:');
      return this.cacheManager.deleteKeysByPattern(pattern);
    }
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
}
