/**
 * Configuration management for the MCP server
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "node:path";
import type { ServerConfig, CacheConfiguration } from "../types/index.js";

export function parseCliArgs(): { workspaceRoot: string } {
  const argv = yargs(hideBin(process.argv))
    .option("workspaceRoot", { type: "string", demandOption: true })
    .parseSync();

  return {
    workspaceRoot: path.resolve(argv.workspaceRoot),
  };
}

export function createServerConfig(workspaceRoot: string): ServerConfig {
  return {
    workspaceRoot,
    watchPatterns: [
      "**/*.{ts,tsx,js,jsx}",
      "package.json",
      "package-lock.json", 
      "pnpm-lock.yaml",
      "tsconfig.*"
    ],
    ignoredPatterns: ["**/node_modules/**"],
  };
}

/**
 * Create cache configuration with defaults and environment-based overrides
 */
export function createCacheConfig(): CacheConfiguration {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLargeProject = process.env.MCP_LARGE_PROJECT === 'true';

  return {
    // TTL settings (in seconds)
    fileMetadataTTL: parseInt(process.env.MCP_CACHE_METADATA_TTL || '300'), // 5 minutes
    operationResultTTL: parseInt(process.env.MCP_CACHE_OPERATION_TTL || '1800'), // 30 minutes
    projectStructureTTL: parseInt(process.env.MCP_CACHE_STRUCTURE_TTL || '900'), // 15 minutes
    
    // Memory management
    maxKeys: parseInt(process.env.MCP_CACHE_MAX_KEYS || (isLargeProject ? '2000' : '1000')),
    checkPeriod: parseInt(process.env.MCP_CACHE_CHECK_PERIOD || '120'), // 2 minutes
    
    // Performance settings
    useClones: process.env.MCP_CACHE_USE_CLONES === 'true' || false,
    
    // Cache warming settings
    enableWarmup: process.env.MCP_CACHE_WARMUP !== 'false', // Default true
    warmupBatchSize: parseInt(process.env.MCP_CACHE_WARMUP_BATCH || '10'),
    warmupDelay: parseInt(process.env.MCP_CACHE_WARMUP_DELAY || '100'), // ms between batches
    
    // Auto-cleanup settings
    enableAutoCleanup: !isProduction || process.env.MCP_CACHE_AUTO_CLEANUP === 'true',
    cleanupThreshold: parseFloat(process.env.MCP_CACHE_CLEANUP_THRESHOLD || '0.8'), // 80% memory usage
    cleanupInterval: parseInt(process.env.MCP_CACHE_CLEANUP_INTERVAL || '300000'), // 5 minutes
    
    // Performance monitoring
    enableMonitoring: process.env.MCP_CACHE_MONITORING !== 'false', // Default true
    monitoringInterval: parseInt(process.env.MCP_CACHE_MONITORING_INTERVAL || '60000'), // 1 minute
    logPerformanceThreshold: parseFloat(process.env.MCP_CACHE_PERF_THRESHOLD || '0.5'), // 50% hit rate
  };
}

/**
 * Get cache configuration based on project characteristics
 */
export function getOptimalCacheConfig(workspaceRoot: string): CacheConfiguration {
  const baseConfig = createCacheConfig();
  
  // Auto-detect large project characteristics
  try {
    const fs = require('fs');
    const packagePath = path.join(workspaceRoot, 'package.json');
    
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length + 
                      Object.keys(packageJson.devDependencies || {}).length;
      
      // Large project adjustments
      if (depCount > 50) {
        return {
          ...baseConfig,
          maxKeys: Math.max(baseConfig.maxKeys, 2000),
          operationResultTTL: Math.max(baseConfig.operationResultTTL, 3600), // 1 hour
          warmupBatchSize: Math.min(baseConfig.warmupBatchSize, 5), // Smaller batches for large projects
        };
      }
    }
  } catch (error) {
    console.warn('Failed to analyze project size for cache optimization:', error);
  }
  
  return baseConfig;
}
