#!/usr/bin/env node

/**
 * Test script for Phase 2 cache tools
 * Tests the new get_file_metadata and has_file_changed tools
 */

import { spawn } from 'child_process';

async function testPhase2Tools() {
  console.log('Testing Phase 2 Cache Tools...\n');

  // Start the MCP server as a subprocess
  const serverProcess = spawn('node', ['dist/index.js', '--workspaceRoot', process.cwd()], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Add error handling for the server process
  serverProcess.on('error', (error) => {
    console.error('Failed to start server process:', error);
  });

  serverProcess.stderr.on('data', (data) => {
    // Only log errors, not status messages
    const message = data.toString();
    if (message.includes('error') || message.includes('Error')) {
      console.error('Server stderr:', message);
    }
  });

  let requestId = 1;

  // Helper to send JSON-RPC requests
  function sendRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: requestId++,
      method,
      params
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const onData = (data) => {
        clearTimeout(timeout);
        serverProcess.stdout.off('data', onData);
        try {
          const response = JSON.parse(data.toString());
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (e) {
          reject(e);
        }
      };

      serverProcess.stdout.on('data', onData);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  try {
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('1. Testing get_file_metadata tool...');
    const metadataResult = await sendRequest('tools/call', {
      name: 'get_file_metadata',
      arguments: {
        filePaths: ['package.json', 'src/index.ts', 'nonexistent.txt']
      }
    });
    console.log('Metadata result:');
    console.log(metadataResult.content[0].text);
    console.log();

    // Parse the metadata to get hashes for next test
    const metadataJson = JSON.parse(metadataResult.content[0].text.split('\n').slice(1).join('\n'));
    
    console.log('2. Testing has_file_changed tool with current hashes (should show no changes)...');
    const hashMap = {};
    metadataJson.forEach(meta => {
      if (meta.exists) {
        hashMap[meta.path] = meta.contentHash;
      }
    });
    
    const changeResult1 = await sendRequest('tools/call', {
      name: 'has_file_changed',
      arguments: {
        fileHashMap: hashMap
      }
    });
    console.log('Change result (no changes expected):');
    console.log(changeResult1.content[0].text);
    console.log();

    console.log('3. Testing has_file_changed with different hashes (should show changes)...');
    const modifiedHashMap = { ...hashMap };
    Object.keys(modifiedHashMap).forEach(key => {
      modifiedHashMap[key] = 'fake-hash-' + Math.random();
    });
    
    const changeResult2 = await sendRequest('tools/call', {
      name: 'has_file_changed',
      arguments: {
        fileHashMap: modifiedHashMap
      }
    });
    console.log('Change result (changes expected):');
    console.log(changeResult2.content[0].text);
    console.log();

    console.log('4. Testing get_project_status to verify existing functionality still works...');
    const statusResult = await sendRequest('tools/call', {
      name: 'get_project_status',
      arguments: {}
    });
    console.log('Status result:');
    console.log(statusResult.content[0].text);
    console.log();

    console.log('✅ All Phase 2 tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    serverProcess.kill();
  }
}

// Run the test
testPhase2Tools().catch(console.error);
