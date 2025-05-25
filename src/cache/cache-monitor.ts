/**
 * Cache monitoring and performance tracking
 * Provides insights into cache effectiveness and automatic optimization
 */

import type { 
  ICacheManager, 
  CacheConfiguration, 
  CacheStats,
  ICacheMonitor,
  CacheMonitoringData,
  CacheHealthMetrics
} from "../types/cache.js";

export class CacheMonitor implements ICacheMonitor {
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private startTime: Date;
  private lastSnapshot: CacheMonitoringData | null = null;
  private performanceHistory: CacheMonitoringData[] = [];
  
  constructor(
    private cacheManager: ICacheManager,
    private config: CacheConfiguration
  ) {
    this.startTime = new Date();
    
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
    
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Start monitoring cache performance
   */
  startMonitoring(): void {
    if (this.monitoringTimer) {
      return;
    }

    this.monitoringTimer = setInterval(() => {
      try {
        this.collectMetrics();
        this.analyzePerformance();
      } catch (error) {
        console.error('Cache monitoring error:', error);
      }
    }, this.config.monitoringInterval);

    console.log(`Cache monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
      console.log('Cache monitoring stopped');
    }
  }

  /**
   * Start automatic cleanup based on memory thresholds
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      try {
        this.performAutoCleanup();
      } catch (error) {
        console.error('Cache auto-cleanup error:', error);
      }
    }, this.config.cleanupInterval);

    console.log(`Cache auto-cleanup started (interval: ${this.config.cleanupInterval}ms)`);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      console.log('Cache auto-cleanup stopped');
    }
  }

  /**
   * Get current cache health metrics
   */
  getHealthMetrics(): CacheHealthMetrics {
    const stats = this.cacheManager.getStats();
    const efficiency = this.cacheManager.getEfficiencyRatio();
    const memoryUsage = this.calculateMemoryUsage(stats);
    const uptime = Date.now() - this.startTime.getTime();

    return {
      efficiency,
      memoryUsage,
      keyCount: stats.keys,
      uptime,
      status: this.getHealthStatus(efficiency, memoryUsage),
      lastUpdated: new Date(),
      recommendations: this.generateRecommendations(efficiency, memoryUsage, stats)
    };
  }

  /**
   * Get detailed monitoring data
   */
  getCurrentMonitoringData(): CacheMonitoringData {
    const stats = this.cacheManager.getStats();
    const health = this.getHealthMetrics();
    
    return {
      timestamp: new Date(),
      stats,
      health,
      memoryUsageBytes: stats.vsize + stats.ksize,
      operationsPerSecond: this.calculateOPS(),
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit: number = 100): CacheMonitoringData[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Force cleanup of cache based on various strategies
   */
  performCleanup(strategy: 'lru' | 'size' | 'age' | 'pattern' = 'lru', options?: any): number {
    let clearedCount = 0;

    switch (strategy) {
      case 'lru':
        clearedCount = this.performLRUCleanup();
        break;
      case 'size':
        clearedCount = this.performSizeBasedCleanup(options?.targetSize || 0.5);
        break;
      case 'age':
        clearedCount = this.performAgeBasedCleanup(options?.maxAge || 3600000); // 1 hour default
        break;
      case 'pattern':
        clearedCount = this.performPatternBasedCleanup(options?.pattern);
        break;
    }

    console.log(`Cache cleanup completed: ${clearedCount} entries removed using ${strategy} strategy`);
    return clearedCount;
  }

  /**
   * Generate cache performance report
   */
  generatePerformanceReport(): string {
    const health = this.getHealthMetrics();
    const currentData = this.getCurrentMonitoringData();
    const history = this.getPerformanceHistory(24); // Last 24 snapshots
    
    const avgEfficiency = history.length > 0 
      ? history.reduce((sum, data) => sum + data.health.efficiency, 0) / history.length 
      : health.efficiency;

    const avgMemoryUsage = history.length > 0
      ? history.reduce((sum, data) => sum + data.health.memoryUsage, 0) / history.length
      : health.memoryUsage;

    return `
Cache Performance Report
========================
Current Status: ${health.status}
Uptime: ${Math.round(health.uptime / 1000 / 60)} minutes

Performance Metrics:
- Hit Rate: ${(health.efficiency * 100).toFixed(1)}% (avg: ${(avgEfficiency * 100).toFixed(1)}%)
- Memory Usage: ${(health.memoryUsage * 100).toFixed(1)}% (avg: ${(avgMemoryUsage * 100).toFixed(1)}%)
- Total Keys: ${health.keyCount}
- Operations/sec: ${currentData.operationsPerSecond.toFixed(1)}

Memory Details:
- Key Storage: ${(currentData.stats.ksize / 1024).toFixed(1)}KB
- Value Storage: ${(currentData.stats.vsize / 1024).toFixed(1)}KB
- Total Memory: ${(currentData.memoryUsageBytes / 1024).toFixed(1)}KB

Recommendations:
${health.recommendations.map(rec => `- ${rec}`).join('\n')}
    `.trim();
  }

  /**
   * Dispose of monitoring resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.stopAutoCleanup();
    this.performanceHistory = [];
    console.log('Cache monitor disposed');
  }

  // Private methods

  private collectMetrics(): void {
    const data = this.getCurrentMonitoringData();
    this.lastSnapshot = data;
    
    // Keep only recent history to prevent memory leaks
    this.performanceHistory.push(data);
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  private analyzePerformance(): void {
    if (!this.lastSnapshot) return;

    const health = this.lastSnapshot.health;
    
    // Log warnings for poor performance
    if (health.efficiency < this.config.logPerformanceThreshold) {
      console.warn(`Cache efficiency below threshold: ${(health.efficiency * 100).toFixed(1)}% (threshold: ${(this.config.logPerformanceThreshold * 100).toFixed(1)}%)`);
    }
    
    if (health.memoryUsage > 0.9) {
      console.warn(`Cache memory usage critical: ${(health.memoryUsage * 100).toFixed(1)}%`);
    } else if (health.memoryUsage > 0.8) {
      console.warn(`Cache memory usage high: ${(health.memoryUsage * 100).toFixed(1)}%`);
    }
  }

  private performAutoCleanup(): void {
    const health = this.getHealthMetrics();
    
    if (health.memoryUsage > this.config.cleanupThreshold) {
      console.log(`Auto-cleanup triggered: memory usage ${(health.memoryUsage * 100).toFixed(1)}% > threshold ${(this.config.cleanupThreshold * 100).toFixed(1)}%`);
      
      // Start with LRU cleanup
      let cleaned = this.performLRUCleanup();
      
      // If still above threshold, do age-based cleanup
      if (this.getHealthMetrics().memoryUsage > this.config.cleanupThreshold) {
        cleaned += this.performAgeBasedCleanup();
      }
      
      console.log(`Auto-cleanup completed: ${cleaned} entries removed`);
    }
  }

  private calculateMemoryUsage(stats: CacheStats): number {
    const totalMemory = stats.vsize + stats.ksize;
    const maxMemory = this.config.maxKeys * 1024; // Rough estimate: 1KB per key
    return Math.min(totalMemory / maxMemory, 1);
  }

  private calculateOPS(): number {
    if (this.performanceHistory.length < 2) return 0;
    
    const recent = this.performanceHistory.slice(-2);
    const timeDiff = recent[1].timestamp.getTime() - recent[0].timestamp.getTime();
    const opsDiff = (recent[1].stats.hits + recent[1].stats.misses) - 
                   (recent[0].stats.hits + recent[0].stats.misses);
    
    return timeDiff > 0 ? (opsDiff / timeDiff) * 1000 : 0;
  }

  private calculateAverageResponseTime(): number {
    // This is a simplified calculation - in a real implementation,
    // you'd track actual response times for cache operations
    const efficiency = this.cacheManager.getEfficiencyRatio();
    return efficiency > 0.8 ? 1 : efficiency > 0.5 ? 2 : 5; // ms
  }

  private getHealthStatus(efficiency: number, memoryUsage: number): 'healthy' | 'warning' | 'critical' {
    if (efficiency < 0.3 || memoryUsage > 0.9) return 'critical';
    if (efficiency < 0.5 || memoryUsage > 0.8) return 'warning';
    return 'healthy';
  }

  private generateRecommendations(efficiency: number, memoryUsage: number, stats: CacheStats): string[] {
    const recommendations: string[] = [];
    
    if (efficiency < 0.5) {
      recommendations.push('Consider increasing TTL values to improve hit rates');
      recommendations.push('Review cache warming strategies for frequently accessed data');
    }
    
    if (memoryUsage > 0.8) {
      recommendations.push('Consider increasing maxKeys limit or reducing TTL values');
      recommendations.push('Enable auto-cleanup or run manual cleanup operations');
    }
    
    if (stats.keys < this.config.maxKeys * 0.1) {
      recommendations.push('Cache may be under-utilized - consider warming more data');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache is performing optimally');
    }
    
    return recommendations;
  }

  private performLRUCleanup(): number {
    // NodeCache handles LRU internally, so we'll use a pattern-based approach
    // to clean up older entries by deleting keys that match patterns for older operations
    const patterns = [
      /^operation:.*:/, // Operation cache entries
      /^metadata:.*:/, // Metadata entries
    ];
    
    let cleaned = 0;
    for (const pattern of patterns) {
      cleaned += this.cacheManager.deleteKeysByPattern(pattern);
      if (this.getHealthMetrics().memoryUsage <= this.config.cleanupThreshold) {
        break;
      }
    }
    
    return cleaned;
  }

  private performSizeBasedCleanup(targetUsage: number = 0.5): number {
    let cleaned = 0;
    const currentUsage = this.getHealthMetrics().memoryUsage;
    
    if (currentUsage <= targetUsage) {
      return 0;
    }
    
    // Remove approximately half of the cache entries to reach target
    const allKeys = this.cacheManager.keys();
    const keysToRemove = Math.floor(allKeys.length * ((currentUsage - targetUsage) / currentUsage));
    
    for (let i = 0; i < keysToRemove && i < allKeys.length; i++) {
      cleaned += this.cacheManager.del(allKeys[i]);
    }
    
    return cleaned;
  }

  private performAgeBasedCleanup(maxAge: number = 3600000): number {
    // Since NodeCache handles TTL internally, we'll focus on clearing specific
    // operation types that are likely to be older
    const oldPatterns = [
      /^structure:outline:/, // Project outline cache
      /^metadata:summary:/, // File summary cache
      /^operation:lint:/, // Lint operation cache
    ];
    
    let cleaned = 0;
    for (const pattern of oldPatterns) {
      cleaned += this.cacheManager.deleteKeysByPattern(pattern);
    }
    
    return cleaned;
  }

  private performPatternBasedCleanup(pattern?: RegExp): number {
    if (!pattern) {
      // Default pattern cleanup - remove temporary/debug entries
      pattern = /^(temp|debug|test):/;
    }
    
    return this.cacheManager.deleteKeysByPattern(pattern);
  }
}
