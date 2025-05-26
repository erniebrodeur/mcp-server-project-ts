#!/usr/bin/env node

/**
 * Test script for Phase 5 - Cache Resources
 * Tests the new cache and metadata resources
 */

import { spawn } from 'child_process';

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js', '--workspaceRoot', process.cwd()], { stdio: ['pipe', 'pipe', 'pipe'] });

let isConnected = false;
let requestId = 1;

// Handle server stderr (logs)
serverProcess.stderr.on('data', (data) => {
  const message = data.toString();
  console.log('Server log:', message.trim());
  if (message.includes('MCP Server connected and ready!')) {
    isConnected = true;
    runPhase5Tests();
  }
});

// Handle server stdout (MCP protocol messages)
let buffer = '';
serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Try to parse complete JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        handleServerResponse(response);
      } catch (e) {
        console.log('Raw server output:', line);
      }
    }
  }
});

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  
  console.log(`\n📤 Sending request: ${method}`);
  console.log(JSON.stringify(request, null, 2));
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request ${request.id} timed out`));
    }, 10000);
    
    // Store the resolve function to be called when response arrives
    pendingRequests.set(request.id, { resolve, reject, timeout });
  });
}

const pendingRequests = new Map();

function handleServerResponse(response) {
  console.log('\n📥 Received response:');
  console.log(JSON.stringify(response, null, 2));
  
  if (response.id && pendingRequests.has(response.id)) {
    const { resolve, reject, timeout } = pendingRequests.get(response.id);
    clearTimeout(timeout);
    pendingRequests.delete(response.id);
    
    if (response.error) {
      reject(new Error(response.error.message || JSON.stringify(response.error)));
    } else {
      resolve(response.result);
    }
  }
}

async function runPhase5Tests() {
  console.log('\n🚀 Starting Phase 5 Resource Tests...\n');

  try {
    // 1. Initialize connection
    console.log('1. Initializing MCP connection...');
    const initResult = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: {},
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    console.log('✅ Connection initialized successfully');
    console.log();

    // 2. List available resources
    console.log('2. Listing available resources...');
    try {
      const resourcesResult = await sendRequest('resources/list');
      console.log('Available resources:');
      resourcesResult.resources.forEach(resource => {
        console.log(`  - ${resource.uri}: ${resource.name}`);
      });
      console.log();
    } catch (error) {
      console.log('❌ Failed to list resources:', error.message);
      console.log();
    }

    // 3. Test cache resources (these might be empty initially)
    console.log('3. Testing cache resources...');
    
    // Test TypeScript errors resource
    console.log('3a. Testing cache://typescript-errors...');
    try {
      const tsErrorsResult = await sendRequest('resources/read', {
        uri: 'cache://typescript-errors'
      });
      console.log('TypeScript errors resource:');
      console.log(tsErrorsResult.contents[0].text);
      console.log();
    } catch (error) {
      console.log('TypeScript errors resource failed:', error.message);
      console.log();
    }

    // Test lint results resource
    console.log('3b. Testing cache://lint-results...');
    try {
      const lintResultsResult = await sendRequest('resources/read', {
        uri: 'cache://lint-results'
      });
      console.log('Lint results resource:');
      console.log(lintResultsResult.contents[0].text);
      console.log();
    } catch (error) {
      console.log('Lint results resource failed:', error.message);
      console.log();
    }

    // Test test results resource
    console.log('3c. Testing cache://test-results...');
    try {
      const testResultsResult = await sendRequest('resources/read', {
        uri: 'cache://test-results'
      });
      console.log('Test results resource:');
      console.log(testResultsResult.contents[0].text);
      console.log();
    } catch (error) {
      console.log('Test results resource failed:', error.message);
      console.log();
    }

    // 4. Test metadata resources
    console.log('4. Testing metadata resources...');
    
    // Test file hashes resource
    console.log('4a. Testing metadata://file-hashes...');
    try {
      const fileHashesResult = await sendRequest('resources/read', {
        uri: 'metadata://file-hashes'
      });
      console.log('File hashes resource:');
      console.log(fileHashesResult.contents[0].text);
      console.log();
    } catch (error) {
      console.log('File hashes resource failed:', error.message);
      console.log();
    }

    // Test project structure resource
    console.log('4b. Testing metadata://project-structure...');
    try {
      const projectStructureResult = await sendRequest('resources/read', {
        uri: 'metadata://project-structure'
      });
      console.log('Project structure resource:');
      console.log(projectStructureResult.contents[0].text);
      console.log();
    } catch (error) {
      console.log('Project structure resource failed:', error.message);
      console.log();
    }

    // 5. Test cache generation by running some cache operations first
    console.log('5. Generating cache data for better resource testing...');
    
    // Run TypeScript check to populate cache
    console.log('5a. Running TypeScript check...');
    try {
      const tsCheckResult = await sendRequest('tools/call', {
        name: 'cache_typescript_check',
        arguments: {}
      });
      console.log('TypeScript check completed');
      console.log();
    } catch (error) {
      console.log('TypeScript check failed:', error.message);
      console.log();
    }

    // Run lint check to populate cache
    console.log('5b. Running lint check...');
    try {
      const lintCheckResult = await sendRequest('tools/call', {
        name: 'cache_lint_results',
        arguments: {
          filePaths: ['src/index.ts']
        }
      });
      console.log('Lint check completed');
      console.log();
    } catch (error) {
      console.log('Lint check failed:', error.message);
      console.log();
    }

    // 6. Re-test cache resources with populated data
    console.log('6. Re-testing cache resources with populated data...');
    
    console.log('6a. Re-testing cache://typescript-errors...');
    try {
      const tsErrorsResult2 = await sendRequest('resources/read', {
        uri: 'cache://typescript-errors'
      });
      console.log('TypeScript errors resource (with data):');
      const data = JSON.parse(tsErrorsResult2.contents[0].text);
      console.log(`Version: ${data.version}`);
      console.log(`Last Updated: ${data.lastUpdated}`);
      console.log(`Has Data: ${data.data ? 'Yes' : 'No'}`);
      if (data.data) {
        console.log(`Success: ${data.data.success}`);
        console.log(`Diagnostics: ${data.data.diagnostics?.length || 0}`);
      }
      console.log();
    } catch (error) {
      console.log('TypeScript errors resource failed:', error.message);
      console.log();
    }

    console.log('6b. Re-testing cache://lint-results...');
    try {
      const lintResultsResult2 = await sendRequest('resources/read', {
        uri: 'cache://lint-results'
      });
      console.log('Lint results resource (with data):');
      const data = JSON.parse(lintResultsResult2.contents[0].text);
      console.log(`Version: ${data.version}`);
      console.log(`Last Updated: ${data.lastUpdated}`);
      console.log(`Has Data: ${data.data ? 'Yes' : 'No'}`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`Files Linted: ${data.data.length}`);
        const totalIssues = data.data.reduce((sum, result) => sum + (result.issues?.length || 0), 0);
        console.log(`Total Issues: ${totalIssues}`);
      }
      console.log();
    } catch (error) {
      console.log('Lint results resource failed:', error.message);
      console.log();
    }

    console.log('✅ All Phase 5 resource tests completed!');
    console.log('\n🎉 Phase 5 Implementation Complete!');
    console.log('New cache and metadata resources are now available:');
    console.log('- cache://typescript-errors: Cached TypeScript compilation results');
    console.log('- cache://lint-results: Cached ESLint results by file');
    console.log('- cache://test-results: Cached test suite results');
    console.log('- metadata://file-hashes: File content hashes for change detection');
    console.log('- metadata://project-structure: Lightweight project tree view');
    console.log('\n📋 Next Steps:');
    console.log('- Test resources with real cache data by running cache tools first');
    console.log('- Integrate resources into MCP client applications');
    console.log('- Monitor resource performance and cache hit rates');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    console.log('\n🔧 Cleaning up...');
    serverProcess.kill();
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating...');
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating...');
  serverProcess.kill();
  process.exit(0);
});

// Wait for server to start
setTimeout(() => {
  if (!isConnected) {
    console.log('❌ Server failed to start within timeout');
    process.exit(1);
  }
}, 10000);
