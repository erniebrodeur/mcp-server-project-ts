/**
 * MCP prompts handler for project management
 */

import type { Prompt } from "../types/mcp.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "../types/mcp.js";

// Define available prompts with their metadata
export const prompts: Prompt[] = [
  {
    name: "project-analysis",
    description: "Analyze a TypeScript/JavaScript project structure and provide insights",
    arguments: [
      {
        name: "focus_area",
        description: "What aspect to focus on (architecture, dependencies, testing, performance, etc.)",
        required: false
      },
      {
        name: "include_suggestions",
        description: "Whether to include improvement suggestions",
        required: false
      }
    ]
  },
  {
    name: "code-review",
    description: "Perform a thorough code review focusing on TypeScript/JavaScript best practices",
    arguments: [
      {
        name: "file_paths",
        description: "Specific files to review (comma-separated paths)",
        required: false
      },
      {
        name: "review_type",
        description: "Type of review: security, performance, maintainability, or general",
        required: false
      }
    ]
  },
  {
    name: "bug-investigation",
    description: "Help investigate and diagnose bugs in TypeScript/JavaScript projects",
    arguments: [
      {
        name: "error_message",
        description: "The error message or description of the bug",
        required: true
      },
      {
        name: "context_files",
        description: "Files that might be related to the issue",
        required: false
      }
    ]
  },
  {
    name: "feature-planning",
    description: "Plan implementation of a new feature in a TypeScript/JavaScript project",
    arguments: [
      {
        name: "feature_description",
        description: "Description of the feature to implement",
        required: true
      },
      {
        name: "complexity_level",
        description: "Expected complexity: simple, moderate, or complex",
        required: false
      }
    ]
  },
  {
    name: "dependency-audit",
    description: "Review and analyze project dependencies for security, updates, and optimization",
    arguments: [
      {
        name: "audit_type",
        description: "Type of audit: security, updates, size-optimization, or comprehensive",
        required: false
      },
      {
        name: "include_devdeps",
        description: "Whether to include dev dependencies in the audit",
        required: false
      }
    ]
  },
  {
    name: "testing-strategy",
    description: "Develop a comprehensive testing strategy for the project",
    arguments: [
      {
        name: "test_type",
        description: "Focus on: unit, integration, e2e, or comprehensive testing",
        required: false
      },
      {
        name: "coverage_target",
        description: "Desired test coverage percentage",
        required: false
      }
    ]
  },
  {
    name: "performance-optimization",
    description: "Analyze and suggest performance optimizations for the project",
    arguments: [
      {
        name: "optimization_area",
        description: "Area to focus on: build, runtime, bundle-size, or memory",
        required: false
      },
      {
        name: "target_metrics",
        description: "Specific performance metrics to target",
        required: false
      }
    ]
  },
  {
    name: "refactoring-plan",
    description: "Create a detailed plan for refactoring legacy or problematic code",
    arguments: [
      {
        name: "target_files",
        description: "Files or modules that need refactoring",
        required: false
      },
      {
        name: "refactoring_goals",
        description: "Goals: maintainability, performance, readability, or modernization",
        required: false
      }
    ]
  }
];

// Prompt templates with dynamic content generation
function generatePromptContent(name: string, args: Record<string, any> = {}): { description: string; messages: Array<{ role: string; content: { type: string; text: string } }> } {
  switch (name) {
    case "project-analysis":
      return {
        description: "Comprehensive TypeScript/JavaScript project analysis",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please analyze this TypeScript/JavaScript project and provide insights.

${args.focus_area ? `Focus Area: ${args.focus_area}` : 'Provide a general overview covering architecture, code quality, dependencies, and potential improvements.'}

Please examine:
1. Project structure and organization
2. Code quality and patterns used
3. Dependencies and their health
4. Build configuration and scripts
5. Testing setup and coverage
6. Documentation quality
7. Performance considerations
8. Security aspects

Use the project's cached metadata, file summaries, and recent changes to provide specific, actionable insights.

${args.include_suggestions === 'true' ? 'Include specific improvement suggestions with implementation steps.' : ''}

Format your response with clear sections and bullet points for easy reading.`
          }
        }]
      };

    case "code-review":
      return {
        description: "Detailed code review for TypeScript/JavaScript",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please perform a thorough code review of this TypeScript/JavaScript project.

${args.file_paths ? `Focus on these specific files: ${args.file_paths}` : 'Review the most recently changed files and critical components.'}
${args.review_type ? `Review Type: ${args.review_type}` : 'Perform a comprehensive review covering all aspects.'}

Please review for:
- Code quality and adherence to TypeScript/JavaScript best practices
- Potential bugs and error handling
- Performance implications
- Security vulnerabilities
- Maintainability and readability
- Test coverage for reviewed code
- Documentation completeness

Use the cached lint results, TypeScript errors, and test results to identify specific issues.

Provide:
1. Summary of findings with severity levels
2. Specific line-by-line feedback where applicable
3. Recommendations for improvements
4. Positive highlights of good practices found

Format findings with clear categories and actionable suggestions.`
          }
        }]
      };

    case "bug-investigation":
      return {
        description: "Bug investigation and diagnosis assistance",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Help me investigate and diagnose this bug in my TypeScript/JavaScript project.

Error/Bug Description: ${args.error_message}
${args.context_files ? `Related Files: ${args.context_files}` : ''}

Please help me:
1. Understand the root cause of this issue
2. Identify the most likely source files
3. Suggest debugging steps
4. Recommend fixes or workarounds
5. Identify if this might be related to recent changes

Use the project's cached data including:
- Recent file changes and their timestamps
- TypeScript compilation errors
- Lint warnings and errors
- Test failures
- Dependency information

Provide a systematic debugging approach with:
- Hypotheses about the cause
- Files to investigate first
- Debugging commands to run
- Code changes to try
- Prevention strategies for similar issues`
          }
        }]
      };

    case "feature-planning":
      return {
        description: "Feature implementation planning",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Help me plan the implementation of a new feature in this TypeScript/JavaScript project.

Feature Description: ${args.feature_description}
${args.complexity_level ? `Expected Complexity: ${args.complexity_level}` : ''}

Please provide:
1. Implementation approach and architecture
2. Files that will need to be created or modified
3. Dependencies that might be needed
4. Testing strategy for this feature
5. Potential challenges and risks
6. Timeline estimation
7. Integration points with existing code

Consider the current project structure:
- Existing patterns and conventions
- Current dependencies and their capabilities
- Testing framework in use
- Build and deployment setup

Deliver a comprehensive implementation plan with:
- Step-by-step breakdown
- Code structure recommendations
- Testing requirements
- Documentation needs
- Rollout strategy`
          }
        }]
      };

    case "dependency-audit":
      return {
        description: "Comprehensive dependency analysis and audit",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please perform a comprehensive audit of this project's dependencies.

${args.audit_type ? `Audit Focus: ${args.audit_type}` : 'Perform a comprehensive audit covering all aspects.'}
${args.include_devdeps === 'true' ? 'Include development dependencies in the analysis.' : 'Focus primarily on production dependencies.'}

Please analyze:
1. Security vulnerabilities and outdated packages
2. Available updates and their impact
3. Bundle size impact and optimization opportunities
4. Dependency health and maintenance status
5. License compatibility
6. Redundant or unnecessary dependencies
7. Missing dependencies for current usage

Use npm audit results and package.json analysis to provide:
- Critical security issues requiring immediate attention
- Recommended updates with migration considerations
- Size optimization opportunities
- Alternative packages that might be better
- Dependency cleanup suggestions

Prioritize findings by:
- Security impact (High/Medium/Low)
- Update urgency
- Performance impact
- Maintenance burden

Provide actionable commands and steps for addressing each issue.`
          }
        }]
      };

    case "testing-strategy":
      return {
        description: "Comprehensive testing strategy development",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Help me develop a comprehensive testing strategy for this TypeScript/JavaScript project.

${args.test_type ? `Testing Focus: ${args.test_type}` : 'Develop a comprehensive strategy covering all testing levels.'}
${args.coverage_target ? `Coverage Target: ${args.coverage_target}%` : ''}

Please analyze the current state and recommend:
1. Testing framework and tools setup
2. Unit testing strategy and patterns
3. Integration testing approach
4. End-to-end testing considerations
5. Test organization and structure
6. Mocking and test data strategies
7. CI/CD integration for testing
8. Performance and load testing needs

Consider the current project:
- Existing test setup and coverage
- Application architecture and complexity
- Critical business logic that needs testing
- External dependencies and APIs
- Browser/environment compatibility needs

Provide:
- Detailed testing pyramid strategy
- Recommended tools and libraries
- Test file organization patterns
- Coverage goals for different code areas
- Implementation timeline and priorities
- Examples of test patterns for this codebase
- Continuous testing and monitoring setup`
          }
        }]
      };

    case "performance-optimization":
      return {
        description: "Performance analysis and optimization recommendations",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Analyze this TypeScript/JavaScript project for performance optimization opportunities.

${args.optimization_area ? `Focus Area: ${args.optimization_area}` : 'Analyze all performance aspects comprehensively.'}
${args.target_metrics ? `Target Metrics: ${args.target_metrics}` : ''}

Please examine:
1. Bundle size and loading performance
2. Runtime performance bottlenecks
3. Memory usage patterns
4. Build time optimization
5. Code splitting opportunities
6. Dependency optimization
7. Caching strategies
8. Asset optimization

Analyze the current setup:
- Build configuration and tools
- Bundle analyzer results if available
- Critical rendering path
- JavaScript execution patterns
- Network requests and resource loading
- Code complexity and algorithmic efficiency

Provide optimization recommendations:
- Immediate wins with high impact
- Build process improvements
- Code refactoring opportunities
- Dependency replacements or removals
- Caching and lazy loading strategies
- Performance monitoring setup
- Benchmarking and measurement tools

Prioritize suggestions by:
- Implementation effort vs. performance gain
- Impact on user experience
- Maintenance complexity
- Browser compatibility considerations`
          }
        }]
      };

    case "refactoring-plan":
      return {
        description: "Strategic refactoring plan development",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Create a detailed refactoring plan for this TypeScript/JavaScript project.

${args.target_files ? `Target Files/Modules: ${args.target_files}` : 'Identify files and modules that would benefit most from refactoring.'}
${args.refactoring_goals ? `Primary Goals: ${args.refactoring_goals}` : 'Focus on improving maintainability, readability, and code quality.'}

Please analyze and plan:
1. Code quality assessment and problem areas
2. Architectural improvements needed
3. Technical debt identification and prioritization
4. Refactoring strategy and approach
5. Risk assessment and mitigation
6. Testing strategy during refactoring
7. Implementation phases and timeline

Examine the current codebase for:
- Code smells and anti-patterns
- Complexity hotspots
- Duplicate code and logic
- Outdated patterns or practices
- Tight coupling and low cohesion
- Poor error handling or resource management
- Missing or inadequate tests

Provide a comprehensive plan including:
- Step-by-step refactoring roadmap
- Risk mitigation strategies
- Testing approach to ensure no regressions
- Code review and validation processes
- Documentation updates needed
- Team coordination and knowledge transfer
- Success metrics and validation criteria

Break down the work into manageable phases with clear deliverables and milestones.`
          }
        }]
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// Create prompt handlers
export function createPromptHandlers() {
  const handlers = {
    listPrompts: async () => {
      return { prompts };
    },

    getPrompt: async (request: { params: { name: string; arguments?: Record<string, any> } }) => {
      const { name, arguments: args = {} } = request.params;
      
      const prompt = prompts.find(p => p.name === name);
      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }

      // Validate required arguments
      const requiredArgs = prompt.arguments?.filter(arg => arg.required) || [];
      const missingArgs = requiredArgs.filter(arg => !args[arg.name]);
      
      if (missingArgs.length > 0) {
        throw new Error(`Missing required arguments: ${missingArgs.map(arg => arg.name).join(', ')}`);
      }

      return generatePromptContent(name, args);
    }
  };

  return handlers;
}

// Register prompt handlers with the server
export function registerPromptHandlers(server: any): void {
  const handlers = createPromptHandlers();

  server.setRequestHandler(ListPromptsRequestSchema, handlers.listPrompts);
  server.setRequestHandler(GetPromptRequestSchema, handlers.getPrompt);
}
