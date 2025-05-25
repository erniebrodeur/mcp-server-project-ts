#!/usr/bin/env node

/**
 * Test Phase 6: Cache Management & Configuration
 * Tests cache configuration, monitoring, and management tools
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let requestId = 1;

async function testPhase6Cache() {
  console.log('=== Testing Phase 6: Cache Management & Configuration ===\n');

  // Start the MCP server
  const serverProcess = spawn('node', ['dist/index.js', '--workspaceRoot', __dirname], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  // Handle server stderr (log messages)
  serverProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[Server] ${message}`);
    }
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

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
    // Test 1: Test cache statistics
    console.log('1. Testing get_cache_stats tool...');
    try {
      const statsResult = await sendRequest('tools/call', {
        name: 'get_cache_stats',
        arguments: {
          includeHistory: false,
          generateReport: false
        }
      });
      console.log('Cache statistics result:');
      console.log(statsResult.content[0].text.substring(0, 500) + '...\n');
    } catch (error) {
      console.log('Cache stats failed:', error.message);
      console.log();
    }

    // Test 2: Test cache warming
    console.log('2. Testing warm_cache tool...');
    try {
      const warmResult = await sendRequest('tools/call', {
        name: 'warm_cache',
        arguments: {
          operations: ['metadata', 'project-structure'],
          backgroundMode: false
        }
      });
      console.log('Cache warming result:');
      console.log(warmResult.content[0].text);
      console.log();
    } catch (error) {
      console.log('Cache warming failed:', error.message);
      console.log();
    }

    // Test 3: Test cache stats after warming
    console.log('3. Testing cache stats after warming...');
    try {
      const statsAfterWarm = await sendRequest('tools/call', {
        name: 'get_cache_stats',
        arguments: {
          includeHistory: false,
          generateReport: false
        }
      });
      console.log('Cache statistics after warming:');
      console.log(statsAfterWarm.content[0].text.substring(0, 500) + '...\n');
    } catch (error) {
      console.log('Cache stats after warming failed:', error.message);
      console.log();
    }

    // Test 4: Test cache clearing
    console.log('4. Testing clear_cache tool...');
    try {
      const clearResult = await sendRequest('tools/call', {
        name: 'clear_cache',
        arguments: {
          cacheType: 'metadata'
        }
      });
      console.log('Cache clear result:');
      console.log(clearResult.content[0].text);
      console.log();
    } catch (error) {
      console.log('Cache clear failed:', error.message);
      console.log();
    }

    // Test 5: Test cache stats with detailed report
    console.log('5. Testing detailed cache statistics report...');
    try {
      const detailedStats = await sendRequest('tools/call', {
        name: 'get_cache_stats',
        arguments: {
          includeHistory: false,
          generateReport: true
        }
      });
      console.log('Detailed cache statistics:');
      console.log(detailedStats.content[0].text.substring(0, 800) + '...\n');
    } catch (error) {
      console.log('Detailed cache stats failed:', error.message);
      console.log();
    }

    // Test 6: Test cache warming with all operations
    console.log('6. Testing cache warming with all operations...');
    try {
      const allWarmResult = await sendRequest('tools/call', {
        name: 'warm_cache',
        arguments: {
          operations: ['all'],
          backgroundMode: true
        }
      });
      console.log('All operations cache warming result:');
      console.log(allWarmResult.content[0].text);
      console.log();
    } catch (error) {
      console.log('All operations cache warming failed:', error.message);
      console.log();
    }

    // Test 7: Test clearing all cache
    console.log('7. Testing clear all cache...');
    try {
      const clearAllResult = await sendRequest('tools/call', {
        name: 'clear_cache',
        arguments: {
          cacheType: 'all'
        }
      });
      console.log('Clear all cache result:');
      console.log(clearAllResult.content[0].text);
      console.log();
    } catch (error) {
      console.log('Clear all cache failed:', error.message);
      console.log();
    }

    console.log('✅ Phase 6 cache management tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    serverProcess.kill();
    console.log('\n🧹 Server stopped');
  }
}

testPhase6Cache().catch(console.error);
