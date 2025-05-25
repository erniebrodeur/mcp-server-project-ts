/**
 * Core cache manager - wrapper around node-cache with enhanced features
 */

import NodeCache from "node-cache";
import type { ICacheManager, CacheConfiguration, CacheStats } from "../types/cache.js";

export class CacheManager implements ICacheManager {
  private cache: NodeCache;
  private stats: { hits: number; misses: number };

  constructor(config: Partial<CacheConfiguration> = {}) {
    const defaultConfig: CacheConfiguration = {
      fileMetadataTTL: 300, // 5 minutes
      operationResultTTL: 1800, // 30 minutes
      projectStructureTTL: 900, // 15 minutes
      maxKeys: 1000,
      checkPeriod: 120, // 2 minutes
      useClones: false, // Better performance, but be careful with object mutations
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.cache = new NodeCache({
      stdTTL: finalConfig.fileMetadataTTL,
      maxKeys: finalConfig.maxKeys,
      checkperiod: finalConfig.checkPeriod,
      useClones: finalConfig.useClones,
    });

    this.stats = { hits: 0, misses: 0 };

    // Listen for cache events
    this.cache.on("expired", (key, value) => {
      console.log(`Cache key expired: ${key}`);
    });

    this.cache.on("del", (key, value) => {
      console.log(`Cache key deleted: ${key}`);
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    } else {
      this.stats.misses++;
      return undefined;
    }
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 0);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  clear(): void {
    this.cache.flushAll();
  }

  getStats(): CacheStats {
    const nodeStats = this.cache.getStats();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: nodeStats.keys,
      ksize: nodeStats.ksize,
      vsize: nodeStats.vsize,
    };
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return this.cache.keys();
  }

  flushAll(): void {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate a cache key with optional prefix
   */
  generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(":")}`;
  }

  /**
   * Set with operation-specific TTL
   */
  setWithOperationTTL<T>(key: string, value: T, operationType: 'metadata' | 'operation' | 'structure'): boolean {
    const ttlMap = {
      metadata: 300, // 5 minutes
      operation: 1800, // 30 minutes  
      structure: 900, // 15 minutes
    };
    return this.set(key, value, ttlMap[operationType]);
  }

  /**
   * Get keys matching a pattern
   */
  getKeysByPattern(pattern: RegExp): string[] {
    return this.keys().filter(key => pattern.test(key));
  }

  /**
   * Delete keys matching a pattern
   */
  deleteKeysByPattern(pattern: RegExp): number {
    const matchingKeys = this.getKeysByPattern(pattern);
    return matchingKeys.reduce((count, key) => count + this.del(key), 0);
  }

  /**
   * Get cache efficiency ratio
   */
  getEfficiencyRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Log cache performance summary
   */
  logPerformanceSummary(): void {
    const stats = this.getStats();
    const efficiency = this.getEfficiencyRatio();
    
    console.log(`Cache Performance Summary:
      - Hit Rate: ${(efficiency * 100).toFixed(1)}% (${stats.hits}/${stats.hits + stats.misses})
      - Total Keys: ${stats.keys}
      - Memory Usage: ${(stats.vsize / 1024).toFixed(1)}KB values, ${(stats.ksize / 1024).toFixed(1)}KB keys`);
  }
}
