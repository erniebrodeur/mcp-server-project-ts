#!/usr/bin/env node

/**
 * Simple test client to demonstrate MCP server usage
 * This shows how an MCP client would interact with our server
 */

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

async function testMCPServer() {
  console.log('Testing MCP Project Change Tracker Server...\n');

  // Start the MCP server as a subprocess
  const serverProcess = spawn('node', ['dist/index.js', '--workspaceRoot', process.cwd()], {
    stdio: ['pipe', 'pipe', 'pipe']
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
      }, 5000);

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
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('1. Listing available tools...');
    const tools = await sendRequest('tools/list');
    console.log('Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    console.log('2. Getting project status...');
    const status = await sendRequest('tools/call', {
      name: 'get_project_status',
      arguments: {}
    });
    console.log('Status result:');
    console.log(status.content[0].text);
    console.log();

    console.log('3. Testing dependency installation...');
    const installResult = await sendRequest('tools/call', {
      name: 'install_dependency',
      arguments: {
        packageName: 'lodash',
        isDev: false
      }
    });
    console.log('Install result:');
    console.log(installResult.content[0].text);
    console.log();

    console.log('4. Getting updated project status...');
    const updatedStatus = await sendRequest('tools/call', {
      name: 'get_project_status',
      arguments: {}
    });
    console.log('Updated status:');
    console.log(updatedStatus.content[0].text);
    console.log();

    console.log('5. Refreshing changes...');
    const refreshResult = await sendRequest('tools/call', {
      name: 'refresh_changes',
      arguments: {}
    });
    console.log('Refresh result:');
    console.log(refreshResult.content[0].text);
    console.log();

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    serverProcess.kill();
  }
}

// Run the test
testMCPServer().catch(console.error);
