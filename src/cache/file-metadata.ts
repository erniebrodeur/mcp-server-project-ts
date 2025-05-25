/**
 * File metadata service - file hashing and metadata collection
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { sha256 } from "crypto-hash";
import type { 
  IFileMetadataService, 
  FileMetadata, 
  BatchFileChangeResult, 
  FileChangeComparisonResult,
  ICacheManager 
} from "../types/cache.js";

export class FileMetadataService implements IFileMetadataService {
  constructor(private cacheManager: ICacheManager) {}

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const absolutePath = path.resolve(filePath);
    const cacheKey = this.cacheManager.generateKey("metadata", absolutePath);
    
    // Check cache first
    const cached = this.cacheManager.get<FileMetadata>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate metadata
    const metadata = await this.generateMetadata(absolutePath);
    
    // Cache the result
    this.cacheManager.setWithOperationTTL(cacheKey, metadata, "metadata");
    
    return metadata;
  }

  async getMetadataBatch(filePaths: string[]): Promise<FileMetadata[]> {
    const results = await Promise.allSettled(
      filePaths.map(filePath => this.getMetadata(filePath))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Return a "not found" metadata for failed files
        return {
          path: filePaths[index],
          size: 0,
          lastModified: new Date(0),
          contentHash: "",
          exists: false,
        };
      }
    });
  }

  async compareWithHashes(filePathsWithHashes: Record<string, string>): Promise<BatchFileChangeResult> {
    const filePaths = Object.keys(filePathsWithHashes);
    const currentMetadata = await this.getMetadataBatch(filePaths);
    
    const changedFiles: FileChangeComparisonResult[] = [];
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const oldHash = filePathsWithHashes[filePath];
      const metadata = currentMetadata[i];
      
      const comparison: FileChangeComparisonResult = {
        path: filePath,
        changed: false,
        oldHash,
        newHash: metadata.contentHash,
      };

      if (!metadata.exists) {
        comparison.changed = true;
        comparison.reason = "missing";
      } else if (!oldHash) {
        comparison.changed = true;
        comparison.reason = "new";
      } else if (metadata.contentHash !== oldHash) {
        comparison.changed = true;
        comparison.reason = "content";
      }

      if (comparison.changed) {
        changedFiles.push(comparison);
      }
    }

    return {
      changedFiles,
      totalChecked: filePaths.length,
      changedCount: changedFiles.length,
    };
  }

  async calculateHash(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath);
      return await sha256(content);
    } catch (error) {
      // File doesn't exist or can't be read
      return "";
    }
  }

  clearMetadataCache(filePath?: string): void {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      const cacheKey = this.cacheManager.generateKey("metadata", absolutePath);
      this.cacheManager.del(cacheKey);
    } else {
      // Clear all metadata cache entries
      this.cacheManager.deleteKeysByPattern(/^metadata:/);
    }
  }

  private async generateMetadata(absolutePath: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(absolutePath);
      
      // Only calculate hash for reasonably sized files (< 10MB)
      let contentHash = "";
      if (stats.size < 10 * 1024 * 1024) {
        contentHash = await this.calculateHash(absolutePath);
      } else {
        // For large files, use a combination of size + mtime as a "hash"
        contentHash = `large:${stats.size}:${stats.mtime.getTime()}`;
      }

      return {
        path: absolutePath,
        size: stats.size,
        lastModified: stats.mtime,
        contentHash,
        exists: true,
      };
    } catch (error) {
      return {
        path: absolutePath,
        size: 0,
        lastModified: new Date(0),
        contentHash: "",
        exists: false,
      };
    }
  }

  /**
   * Validate that a file hasn't changed by comparing its current hash with cached hash
   */
  async validateFileUnchanged(filePath: string, expectedHash: string): Promise<boolean> {
    const currentHash = await this.calculateHash(filePath);
    return currentHash === expectedHash && currentHash !== "";
  }

  /**
   * Get quick file stats without full metadata calculation
   */
  async getQuickStats(filePath: string): Promise<{ exists: boolean; size: number; mtime: Date }> {
    try {
      const stats = await fs.stat(path.resolve(filePath));
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch {
      return {
        exists: false,
        size: 0,
        mtime: new Date(0),
      };
    }
  }

  /**
   * Pre-warm cache for a list of files (background operation)
   */
  async warmCache(filePaths: string[]): Promise<void> {
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(filePath => this.getMetadata(filePath)));
    }
  }
}
