/**
 * File summary generation and analysis
 * Provides lightweight file analysis without full content parsing
 */

import path from "node:path";
import { readFile } from "node:fs/promises";
import type { 
  FileSummary, 
  FileType,
  ICacheManager,
  IFileMetadataService 
} from "../types/cache.js";

export class FileSummaryGenerator {
  constructor(
    private cacheManager: ICacheManager,
    private fileMetadataService: IFileMetadataService,
    private workspaceRoot: string
  ) {}

  /**
   * Get file summary with caching
   */
  async getFileSummary(filePath: string): Promise<FileSummary> {
    const absolutePath = path.resolve(this.workspaceRoot, filePath);
    const metadata = await this.fileMetadataService.getMetadata(absolutePath);
    
    if (!metadata.exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const cacheKey = this.generateCacheKey(absolutePath, metadata.contentHash);
    
    // Try to get cached result
    const cached = this.cacheManager.get<FileSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new summary
    const summary = await this.generateSummary(absolutePath, metadata);
    
    // Cache the result
    this.cacheManager.setWithOperationTTL(cacheKey, summary, 'metadata');
    
    return summary;
  }

  /**
   * Get summaries for multiple files
   */
  async getFileSummaries(filePaths: string[]): Promise<FileSummary[]> {
    const summaries: FileSummary[] = [];
    
    for (const filePath of filePaths) {
      try {
        const summary = await this.getFileSummary(filePath);
        summaries.push(summary);
      } catch (error) {
        console.warn(`Failed to get summary for ${filePath}:`, error);
      }
    }
    
    return summaries;
  }

  /**
   * Generate file summary by analyzing content
   */
  private async generateSummary(filePath: string, metadata: any): Promise<FileSummary> {
    const fileType = this.classifyFileType(filePath);
    const relativePath = path.relative(this.workspaceRoot, filePath);
    
    let exports: string[] = [];
    let imports: string[] = [];
    let description: string | undefined;
    let complexity: 'low' | 'medium' | 'high' = 'low';

    // Only analyze certain file types for imports/exports
    if (this.shouldAnalyzeContent(fileType)) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const analysis = this.analyzeContent(content, fileType);
        
        exports = analysis.exports;
        imports = analysis.imports;
        description = analysis.description;
        complexity = analysis.complexity;
      } catch (error) {
        console.warn(`Failed to analyze content of ${filePath}:`, error);
      }
    }

    return {
      path: relativePath,
      fileType,
      exports,
      imports,
      description,
      size: metadata.size,
      lastModified: metadata.lastModified,
      contentHash: metadata.contentHash,
      complexity
    };
  }

  /**
   * Analyze file content for imports, exports, and other metadata
   */
  private analyzeContent(content: string, fileType: FileType): {
    exports: string[];
    imports: string[];
    description?: string;
    complexity: 'low' | 'medium' | 'high';
  } {
    const lines = content.split('\n');
    const exports: string[] = [];
    const imports: string[] = [];
    let description: string | undefined;

    // Extract exports and imports using simple regex patterns
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines for analysis
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        // Check for file description in comments
        if (!description && (trimmedLine.startsWith('/**') || trimmedLine.startsWith('/*'))) {
          const comment = trimmedLine.replace(/^\/\*+\s*|\s*\*+\/$/g, '').trim();
          if (comment && comment.length > 10 && !comment.includes('filepath:')) {
            description = comment;
          }
        }
        continue;
      }

      // Extract imports
      const importMatch = trimmedLine.match(/^import\s+(?:.*?\s+from\s+)?['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        imports.push(importMatch[1]);
        continue;
      }

      // Extract require statements
      const requireMatch = trimmedLine.match(/require\(['"`]([^'"`]+)['"`]\)/);
      if (requireMatch) {
        imports.push(requireMatch[1]);
        continue;
      }

      // Extract exports
      if (trimmedLine.startsWith('export ')) {
        // Named exports: export { foo, bar }
        const namedExportMatch = trimmedLine.match(/export\s*\{\s*([^}]+)\s*\}/);
        if (namedExportMatch) {
          const namedExports = namedExportMatch[1]
            .split(',')
            .map(exp => exp.trim().split(' as ')[0].trim())
            .filter(exp => exp);
          exports.push(...namedExports);
        }
        
        // Function/class exports: export function foo, export class Bar
        const functionClassMatch = trimmedLine.match(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/);
        if (functionClassMatch) {
          exports.push(functionClassMatch[1]);
        }
        
        // Default export: export default
        if (trimmedLine.includes('export default')) {
          const defaultMatch = trimmedLine.match(/export\s+default\s+(?:function\s+)?(\w+)?/);
          if (defaultMatch && defaultMatch[1]) {
            exports.push(`default(${defaultMatch[1]})`);
          } else {
            exports.push('default');
          }
        }
      }

      // Module.exports (CommonJS)
      const moduleExportMatch = trimmedLine.match(/module\.exports\s*=\s*(\w+)/);
      if (moduleExportMatch) {
        exports.push(moduleExportMatch[1]);
      }

      // exports.foo = (CommonJS)
      const namedModuleExportMatch = trimmedLine.match(/exports\.(\w+)\s*=/);
      if (namedModuleExportMatch) {
        exports.push(namedModuleExportMatch[1]);
      }
    }

    // Calculate complexity based on various factors
    const complexity = this.calculateComplexity(content, fileType);

    return {
      exports: [...new Set(exports)], // Remove duplicates
      imports: [...new Set(imports)], // Remove duplicates
      description,
      complexity
    };
  }

  /**
   * Calculate file complexity
   */
  private calculateComplexity(content: string, fileType: FileType): 'low' | 'medium' | 'high' {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    // Simple heuristics for complexity
    const hasClasses = content.includes('class ');
    const hasInterfaces = content.includes('interface ');
    const hasGenerics = content.includes('<T>') || content.includes('<K,') || content.includes('<V>');
    const hasAsync = content.includes('async ') || content.includes('await ');
    const hasComplexRegex = (content.match(/\/.*\/[gimuy]*/) || []).length > 2;
    const hasManyFunctions = (content.match(/function\s+\w+|=>\s*{|:\s*\([^)]*\)\s*=>/g) || []).length;
    
    let complexityScore = 0;
    
    // Line count factor
    if (nonEmptyLines > 200) complexityScore += 3;
    else if (nonEmptyLines > 100) complexityScore += 2;
    else if (nonEmptyLines > 50) complexityScore += 1;
    
    // Language feature factors
    if (hasClasses) complexityScore += 1;
    if (hasInterfaces) complexityScore += 1;
    if (hasGenerics) complexityScore += 2;
    if (hasAsync) complexityScore += 1;
    if (hasComplexRegex) complexityScore += 1;
    if (hasManyFunctions > 10) complexityScore += 2;
    else if (hasManyFunctions > 5) complexityScore += 1;
    
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Classify file type (reuse from project outline)
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
   * Check if file type should be analyzed for content
   */
  private shouldAnalyzeContent(fileType: FileType): boolean {
    return ['typescript', 'javascript', 'tsx', 'jsx', 'test'].includes(fileType);
  }

  /**
   * Generate cache key for file summary
   */
  private generateCacheKey(filePath: string, contentHash: string): string {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    return this.cacheManager.generateKey('metadata', 'summary', relativePath, contentHash);
  }

  /**
   * Clear file summary cache
   */
  clearCache(filePath?: string): number {
    if (filePath) {
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const pattern = new RegExp(`^metadata:summary:${relativePath.replace(/[/\\]/g, ':')}:`);
      return this.cacheManager.deleteKeysByPattern(pattern);
    } else {
      const pattern = new RegExp('^metadata:summary:');
      return this.cacheManager.deleteKeysByPattern(pattern);
    }
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
