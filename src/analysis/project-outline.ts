/**
 * Project structure analysis and outline generation
 * Provides high-level project structure without reading file contents
 */

import path from "node:path";
import { stat } from "node:fs/promises";
import type { 
  ProjectOutline, 
  DirectoryNode, 
  ProjectStats, 
  FileType,
  ProjectOutlineOptions,
  ICacheManager,
  IFileMetadataService 
} from "../types/cache.js";

export class ProjectOutlineGenerator {
  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private workspaceRoot: string
  ) {}

  /**
   * Generate project outline with caching
   */
  async getProjectOutline(options: ProjectOutlineOptions = {}): Promise<ProjectOutline> {
    const cacheKey = this.generateCacheKey(options);
    
    // Try to get cached result
    const cached = this.cacheManager.get<ProjectOutline>(cacheKey);
    if (cached && await this.isOutlineValid(cached)) {
      return cached;
    }

    // Generate new outline
    const outline = await this.generateOutline(options);
    
    // Cache the result with structure TTL
    this.cacheManager.setWithOperationTTL(cacheKey, outline, 'structure');
    
    return outline;
  }

  /**
   * Generate fresh project outline
   */
  private async generateOutline(options: ProjectOutlineOptions): Promise<ProjectOutline> {
    const {
      maxDepth = 10,
      excludePatterns = ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      includeHidden = false,
      includeSizes = true
    } = options;

    // Use fast-glob to discover files
    const glob = await import('fast-glob');
    
    const patterns = [
      '**/*',
      ...(includeHidden ? ['**/.*'] : [])
    ];

    const files = await glob.default(patterns, {
      cwd: this.workspaceRoot,
      absolute: true,
      ignore: excludePatterns,
      deep: maxDepth,
      onlyFiles: false,
      markDirectories: true
    });

    // Build directory tree
    const structure = await this.buildDirectoryTree(files, includeSizes);
    
    // Calculate statistics
    const stats = await this.calculateStats(files);
    
    // Analyze file types
    const fileTypes = this.analyzeFileTypes(files);

    return {
      structure,
      stats,
      fileTypes,
      timestamp: new Date()
    };
  }

  /**
   * Build hierarchical directory tree
   */
  private async buildDirectoryTree(files: string[], includeSizes: boolean): Promise<DirectoryNode> {
    const root: DirectoryNode = {
      name: path.basename(this.workspaceRoot),
      type: 'directory',
      path: this.workspaceRoot,
      children: []
    };

    // Create a map for quick lookups
    const nodeMap = new Map<string, DirectoryNode>();
    nodeMap.set(this.workspaceRoot, root);

    // Sort files to ensure directories are processed before their contents
    const sortedFiles = files.sort();

    for (const filePath of sortedFiles) {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      if (!relativePath || relativePath === '.') continue;

      const parts = relativePath.split(path.sep);
      let currentPath = this.workspaceRoot;
      let currentNode = root;

      // Navigate/create path to this file
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = path.join(currentPath, part);
        
        let node = nodeMap.get(currentPath);
        
        if (!node) {
          const isLast = i === parts.length - 1;
          const isDirectory = filePath.endsWith('/') || !isLast;
          
          node = {
            name: part,
            type: isDirectory ? 'directory' : 'file',
            path: currentPath,
            ...(isDirectory ? { children: [] } : {})
          };

          // Add file-specific metadata
          if (!isDirectory) {
            node.fileType = this.classifyFileType(currentPath);
            
            if (includeSizes) {
              try {
                const stats = await stat(currentPath);
                node.size = stats.size;
              } catch (error) {
                // File might not exist or be accessible, skip size
              }
            }
          }

          nodeMap.set(currentPath, node);
          currentNode.children!.push(node);
        }
        
        currentNode = node;
      }
    }

    // Sort children in each directory (directories first, then files alphabetically)
    this.sortDirectoryChildren(root);

    return root;
  }

  /**
   * Sort directory children recursively
   */
  private sortDirectoryChildren(node: DirectoryNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });

      // Recursively sort children
      for (const child of node.children) {
        this.sortDirectoryChildren(child);
      }
    }
  }

  /**
   * Calculate project statistics
   */
  private async calculateStats(files: string[]): Promise<ProjectStats> {
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSize = 0;
    const filesByExtension: Record<string, number> = {};
    const largestFiles: Array<{ path: string; size: number }> = [];

    for (const filePath of files) {
      if (filePath.endsWith('/')) {
        totalDirectories++;
      } else {
        totalFiles++;
        
        const ext = path.extname(filePath).toLowerCase();
        filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;

        try {
          const stats = await stat(filePath);
          totalSize += stats.size;
          
          largestFiles.push({ path: filePath, size: stats.size });
        } catch (error) {
          // Skip files that can't be accessed
        }
      }
    }

    // Keep only top 10 largest files
    largestFiles.sort((a, b) => b.size - a.size);
    largestFiles.splice(10);

    return {
      totalFiles,
      totalDirectories,
      totalSize,
      filesByExtension,
      largestFiles
    };
  }

  /**
   * Analyze file types distribution
   */
  private analyzeFileTypes(files: string[]): Record<string, number> {
    const fileTypes: Record<string, number> = {};

    for (const filePath of files) {
      if (!filePath.endsWith('/')) {
        const fileType = this.classifyFileType(filePath);
        fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
      }
    }

    return fileTypes;
  }

  /**
   * Classify file type based on extension and name patterns
   */
  classifyFileType(filePath: string): FileType {
    const fileName = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // TypeScript/JavaScript
    if (ext === '.ts') return 'typescript';
    if (ext === '.tsx') return 'tsx';
    if (ext === '.js') return 'javascript';
    if (ext === '.jsx') return 'jsx';

    // Tests
    if (fileName.includes('.test.') || fileName.includes('.spec.') || 
        filePath.includes('/test/') || filePath.includes('/tests/')) {
      return 'test';
    }

    // Configuration
    if (fileName.startsWith('.') || 
        fileName.includes('config') || 
        fileName.includes('rc') ||
        ['package.json', 'tsconfig.json', 'eslintrc', 'prettierrc'].some(pattern => fileName.includes(pattern))) {
      return 'config';
    }

    // Documentation
    if (['.md', '.txt', '.rst', '.doc', '.docx'].includes(ext) || 
        fileName.includes('readme') || fileName.includes('changelog')) {
      return 'documentation';
    }

    // Styles
    if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
      return 'style';
    }

    // Assets
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      return 'asset';
    }

    // Data
    if (['.json', '.xml', '.yml', '.yaml', '.csv', '.sql'].includes(ext)) {
      return 'data';
    }

    // Build artifacts
    if (filePath.includes('/dist/') || filePath.includes('/build/') || 
        ['.map', '.min.js', '.min.css'].includes(ext)) {
      return 'build';
    }

    return 'other';
  }

  /**
   * Check if cached outline is still valid
   */
  private async isOutlineValid(outline: ProjectOutline): Promise<boolean> {
    // Simple validation: check if outline is recent (within 5 minutes)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - outline.timestamp.getTime() < maxAge;
  }

  /**
   * Generate cache key for outline options
   */
  private generateCacheKey(options: ProjectOutlineOptions): string {
    const keyParts = [
      'outline',
      options.maxDepth?.toString() || 'default',
      options.excludePatterns?.join(',') || 'default',
      options.includeHidden ? 'hidden' : 'nohidden',
      options.includeSizes ? 'sizes' : 'nosizes'
    ];
    
    return this.cacheManager.generateKey('structure', ...keyParts);
  }

  /**
   * Clear project outline cache
   */
  clearCache(): number {
    const pattern = new RegExp('^structure:outline:');
    return this.cacheManager.deleteKeysByPattern(pattern);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheHits: this.cacheManager.getStats().hits,
      cacheMisses: this.cacheManager.getStats().misses
    };
  }
}
