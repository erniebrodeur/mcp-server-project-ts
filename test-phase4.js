#!/usr/bin/env node

/**
 * Test script for Phase 4 tools
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: __dirname
});

let serverReady = false;

// Wait for server to be ready
setTimeout(() => {
  console.log('Testing Phase 4 tools...');
  
  // Test get_project_outline
  const outlineTest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_project_outline",
      arguments: {
        maxDepth: 3,
        includeHidden: false,
        includeSizes: true
      }
    }
  };
  
  console.log('Testing get_project_outline...');
  serverProcess.stdin.write(JSON.stringify(outlineTest) + '\n');
  
  // Test get_file_summary after a delay
  setTimeout(() => {
    const summaryTest = {
      jsonrpc: "2.0", 
      id: 2,
      method: "tools/call",
      params: {
        name: "get_file_summary",
        arguments: {
          filePath: "src/handlers/tools.ts"
        }
      }
    };
    
    console.log('Testing get_file_summary...');
    serverProcess.stdin.write(JSON.stringify(summaryTest) + '\n');
    
    // Close after testing
    setTimeout(() => {
      console.log('Tests completed, closing server...');
      serverProcess.kill();
    }, 2000);
  }, 1000);
  
}, 1000);

serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.result && response.result.content) {
        console.log(`\n=== Response ${response.id} ===`);
        console.log(response.result.content[0].text);
        console.log('========================\n');
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

serverProcess.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});
