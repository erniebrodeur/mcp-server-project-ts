// Jest setup file
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Reset console mocks before each test
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console methods after each test
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Add custom matchers if needed
expect.extend({
  toBeValidMCPResponse(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 ('result' in received || 'error' in received) &&
                 'id' in received;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid MCP response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid MCP response`,
        pass: false,
      };
    }
  },
});
