// Testing helper utilities
import { jest } from '@jest/globals';
import type { Tool, Resource } from '../../src/types/mcp.js';

/**
 * Mock MCP Client for testing server responses
 */
export class MockMCPClient {
  private requestId = 1;

  async sendRequest(method: string, params: any = {}) {
    return {
      jsonrpc: "2.0",
      id: this.requestId++,
      method,
      params
    };
  }

  mockResponse(result: any, error?: any) {
    return {
      jsonrpc: "2.0",
      id: this.requestId - 1,
      ...(error ? { error } : { result })
    };
  }
}

/**
 * Create a temporary test directory
 */
export async function createTempDir(): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const tempDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create test files in a directory
 */
export async function createTestFiles(baseDir: string, files: Record<string, string>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock file system operations
 */
export function mockFileSystem() {
  return {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn(),
  };
}

/**
 * Mock process execution
 */
export function mockProcessExecution() {
  return {
    spawn: jest.fn(),
    exec: jest.fn(),
    execSync: jest.fn(),
  };
}

/**
 * Validate MCP tool structure
 */
export function validateMCPTool(tool: any): tool is Tool {
  return (
    typeof tool === 'object' &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.inputSchema === 'object'
  );
}

/**
 * Validate MCP resource structure
 */
export function validateMCPResource(resource: any): resource is Resource {
  return (
    typeof resource === 'object' &&
    typeof resource.uri === 'string' &&
    typeof resource.name === 'string'
  );
}
