#!/usr/bin/env node

/**
 * Test MCP Prompts functionality
 * Tests prompts listing and generation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let requestId = 1;

async function testPrompts() {
  console.log('=== Testing MCP Prompts Functionality ===\n');

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
    // Test 1: List all available prompts
    console.log('1. Testing prompts/list...');
    try {
      const promptsResult = await sendRequest('prompts/list');
      console.log(`✅ Found ${promptsResult.prompts.length} prompts:`);
      promptsResult.prompts.forEach((prompt, index) => {
        console.log(`   ${index + 1}. ${prompt.name} - ${prompt.description}`);
        if (prompt.arguments && prompt.arguments.length > 0) {
          console.log(`      Arguments: ${prompt.arguments.map(arg => `${arg.name}${arg.required ? '*' : ''}`).join(', ')}`);
        }
      });
      console.log();
    } catch (error) {
      console.log('❌ List prompts failed:', error.message);
      console.log();
    }

    // Test 2: Get project analysis prompt
    console.log('2. Testing project-analysis prompt...');
    try {
      const analysisPrompt = await sendRequest('prompts/get', {
        name: 'project-analysis',
        arguments: {
          focus_area: 'architecture',
          include_dependencies: 'true'
        }
      });
      console.log('✅ Project analysis prompt generated successfully!');
      console.log(`   Description: ${analysisPrompt.description}`);
      console.log(`   Message length: ${analysisPrompt.messages[0].content.text.length} characters`);
      console.log(`   Preview: ${analysisPrompt.messages[0].content.text.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.log('❌ Project analysis prompt failed:', error.message);
      console.log();
    }

    // Test 3: Get code review prompt
    console.log('3. Testing code-review prompt...');
    try {
      const reviewPrompt = await sendRequest('prompts/get', {
        name: 'code-review',
        arguments: {
          review_type: 'security',
          focus_areas: 'security,performance'
        }
      });
      console.log('✅ Code review prompt generated successfully!');
      console.log(`   Description: ${reviewPrompt.description}`);
      console.log(`   Message length: ${reviewPrompt.messages[0].content.text.length} characters`);
      console.log(`   Preview: ${reviewPrompt.messages[0].content.text.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.log('❌ Code review prompt failed:', error.message);
      console.log();
    }

    // Test 4: Get feature planning prompt
    console.log('4. Testing feature-planning prompt...');
    try {
      const featurePrompt = await sendRequest('prompts/get', {
        name: 'feature-planning',
        arguments: {
          feature_description: 'Real-time notifications system',
          complexity_level: 'moderate'
        }
      });
      console.log('✅ Feature planning prompt generated successfully!');
      console.log(`   Description: ${featurePrompt.description}`);
      console.log(`   Message length: ${featurePrompt.messages[0].content.text.length} characters`);
      console.log(`   Preview: ${featurePrompt.messages[0].content.text.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.log('❌ Feature planning prompt failed:', error.message);
      console.log();
    }

    // Test 5: Get bug investigation prompt
    console.log('5. Testing bug-investigation prompt...');
    try {
      const bugPrompt = await sendRequest('prompts/get', {
        name: 'bug-investigation',
        arguments: {
          error_message: 'Memory leak in React components',
          context_files: 'src/components/UserList.tsx,src/hooks/useUsers.ts'
        }
      });
      console.log('✅ Bug investigation prompt generated successfully!');
      console.log(`   Description: ${bugPrompt.description}`);
      console.log(`   Message length: ${bugPrompt.messages[0].content.text.length} characters`);
      console.log(`   Preview: ${bugPrompt.messages[0].content.text.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.log('❌ Bug investigation prompt failed:', error.message);
      console.log();
    }

    // Test 6: Get testing strategy prompt
    console.log('6. Testing testing-strategy prompt...');
    try {
      const testingPrompt = await sendRequest('prompts/get', {
        name: 'testing-strategy',
        arguments: {
          test_types: 'unit,integration,e2e',
          coverage_goal: '85'
        }
      });
      console.log('✅ Testing strategy prompt generated successfully!');
      console.log(`   Description: ${testingPrompt.description}`);
      console.log(`   Message length: ${testingPrompt.messages[0].content.text.length} characters`);
      console.log(`   Preview: ${testingPrompt.messages[0].content.text.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.log('❌ Testing strategy prompt failed:', error.message);
      console.log();
    }

    // Test 7: Test prompt with missing required arguments
    console.log('7. Testing error handling with missing arguments...');
    try {
      await sendRequest('prompts/get', {
        name: 'feature-planning'
        // Missing required arguments
      });
      console.log('❌ Should have failed with missing arguments');
    } catch (error) {
      console.log('✅ Correctly handled missing arguments:', error.message);
      console.log();
    }

    // Test 8: Test non-existent prompt
    console.log('8. Testing non-existent prompt...');
    try {
      await sendRequest('prompts/get', {
        name: 'non-existent-prompt'
      });
      console.log('❌ Should have failed with non-existent prompt');
    } catch (error) {
      console.log('✅ Correctly handled non-existent prompt:', error.message);
      console.log();
    }

    console.log('✅ MCP Prompts testing completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    serverProcess.kill();
    console.log('\n🧹 Server stopped');
  }
}

testPrompts().catch(console.error);
