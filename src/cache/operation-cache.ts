/**
 * Generic framework for caching expensive operations
 * Handles smart invalidation based on file changes
 */

import path from "node:path";
import type { 
  ICacheManager, 
  IOperationCache, 
  CachedOperationResult, 
  OperationType,
  IFileMetadataService 
} from "../types/cache.js";

export class OperationCache implements IOperationCache {
  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService
  ) {}

  /**
   * Cache an expensive operation result
   */
  cacheOperation(operationType: OperationType, key: string, result: CachedOperationResult): void {
    const cacheKey = this.cacheManager.generateKey('operation', operationType, key);
    this.cacheManager.setWithOperationTTL(cacheKey, result, 'operation');
  }

  /**
   * Get cached operation result
   */
  getCachedOperation(operationType: OperationType, key: string): CachedOperationResult | undefined {
    const cacheKey = this.cacheManager.generateKey('operation', operationType, key);
    return this.cacheManager.get<CachedOperationResult>(cacheKey);
  }

  /**
   * Invalidate cached operations when files change
   */
  async invalidateByFiles(changedFiles: string[]): Promise<void> {
    const allKeys = this.cacheManager.keys();
    const operationKeys = allKeys.filter(key => key.startsWith('operation:'));
    
    let invalidatedCount = 0;
    
    for (const cacheKey of operationKeys) {
      const cached = this.cacheManager.get<CachedOperationResult>(cacheKey);
      if (cached && this.shouldInvalidate(cached, changedFiles)) {
        this.cacheManager.del(cacheKey);
        invalidatedCount++;
      }
    }
    
    // Invalidated operations will be rebuilt on next access
  }

  /**
   * Get operation statistics
   */
  getOperationStats(operationType: OperationType): { hits: number; misses: number } {
    const pattern = new RegExp(`^operation:${operationType}:`);
    const keys = this.cacheManager.getKeysByPattern(pattern);
    
    // This is a simplified version - in a real implementation,
    // we'd track hits/misses per operation type
    const totalStats = this.cacheManager.getStats();
    return {
      hits: Math.round(totalStats.hits * (keys.length / Math.max(totalStats.keys, 1))),
      misses: Math.round(totalStats.misses * (keys.length / Math.max(totalStats.keys, 1)))
    };
  }

  /**
   * Check if cached operation should be invalidated based on file changes
   */
  private shouldInvalidate(cached: CachedOperationResult, changedFiles: string[]): boolean {
    // Check if any of the files that influenced this result have changed
    for (const filePath of changedFiles) {
      // Normalize paths for comparison
      const normalizedPath = path.resolve(filePath);
      
      // Check if this file was part of the cached operation
      for (const cachedFile of Object.keys(cached.fileHashes)) {
        const normalizedCachedFile = path.resolve(cachedFile);
        if (normalizedPath === normalizedCachedFile) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Validate cached operation against current file hashes
   */
  async validateCachedOperation(cached: CachedOperationResult): Promise<boolean> {
    try {
      const result = await this.fileMetadataService.compareWithHashes(cached.fileHashes);
      return result.changedCount === 0;
    } catch (error) {
      console.warn('Failed to validate cached operation:', error);
      return false;
    }
  }

  /**
   * Generate cache key for file-based operations
   */
  generateFileBasedKey(files: string[], configFiles: string[] = []): string {
    const allFiles = [...files, ...configFiles].sort();
    return allFiles.map(f => path.basename(f)).join(',');
  }

  /**
   * Clear all cached operations of a specific type
   */
  clearOperationType(operationType: OperationType): number {
    const pattern = new RegExp(`^operation:${operationType}:`);
    return this.cacheManager.deleteKeysByPattern(pattern);
  }

  /**
   * Get all cached operations summary
   */
  getCachedOperationsSummary(): Record<OperationType, number> {
    const allKeys = this.cacheManager.keys();
    const operationKeys = allKeys.filter(key => key.startsWith('operation:'));
    
    const summary: Record<string, number> = {};
    
    for (const key of operationKeys) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const operationType = parts[1];
        summary[operationType] = (summary[operationType] || 0) + 1;
      }
    }
    
    return summary as Record<OperationType, number>;
  }
}
