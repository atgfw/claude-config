/**
 * Vitest Migration Enforcer Hook
 * BLOCKS Jest imports and requires Vitest migration
 * Enforces: "Vitest is the ONLY approved test framework"
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Patterns that indicate Jest usage (blocked)
 */
const JEST_PATTERNS = [
  // Import statements
  /import\s+.*\s+from\s+['"]@jest\/globals['"]/i,
  /import\s+.*\s+from\s+['"]jest['"]/i,
  /import\s+\{\s*jest\s*\}/i,
  // Require statements
  /require\s*\(\s*['"]@jest\/globals['"]\s*\)/i,
  /require\s*\(\s*['"]jest['"]\s*\)/i,
  // Jest globals
  /\bjest\.fn\s*\(/i,
  /\btest\.each\s*\(/i,
  /\btest\.concurrent\s*\(/i,
  // Jest config files
  /jest\.config\.(js|ts|mjs|cjs)/i,
  // Package.json with jest dependencies
  /"jest":/i,
  /"@jest\//i,
  /"ts-jest":/i,
  /"jest-environment-/i,
];

/**
 * Check if content contains Jest usage
 */
function containsJestUsage(content: string): boolean {
  return JEST_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Extract file path and content from Write/Edit tool inputs
 */
function extractFileInfo(input: PreToolUseInput): { filePath?: string; content?: string } {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') {
    return {};
  }

  const filePath = toolInput['file_path'] as string | undefined;

  // Write tool
  if ('content' in toolInput && typeof toolInput['content'] === 'string') {
    return { filePath, content: toolInput['content'] };
  }

  // Edit tool - check both old_string and new_string
  if ('new_string' in toolInput && typeof toolInput['new_string'] === 'string') {
    return { filePath, content: toolInput['new_string'] };
  }

  return { filePath };
}

/**
 * Vitest Migration Enforcer Hook Implementation
 *
 * Blocks Write/Edit operations that introduce Jest usage.
 * Requires migration to Vitest per CLAUDE.md.
 */
export async function vitestMigrationEnforcerHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;

  // Only check Write and Edit tools
  if (toolName !== 'Write' && toolName !== 'Edit') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const { filePath, content } = extractFileInfo(input);

  log(`Checking for Jest usage in file operation...`);

  // Check file path for jest.config files
  if (filePath && /jest\.config\.(js|ts|mjs|cjs)$/i.test(filePath)) {
    logBlocked(
      'Jest config file detected',
      'Vitest is the ONLY approved test framework. When test requests arise: If project has Jest: Migrate to Vitest first.'
    );
    log('');
    log('MIGRATION STEPS:');
    log('1. Uninstall Jest:');
    log('   npm uninstall jest @types/jest ts-jest jest-environment-jsdom');
    log('');
    log('2. Install Vitest:');
    log('   npm install -D vitest @vitest/coverage-v8');
    log('');
    log('3. Replace imports:');
    log('   - import { jest } from "@jest/globals"  →  import { vi } from "vitest"');
    log('   - jest.fn()  →  vi.fn()');
    log('   - jest.mock()  →  vi.mock()');
    log('');
    log('4. Update config:');
    log('   - Delete jest.config.js');
    log('   - Create vitest.config.ts');
    log('');
    log('5. Update package.json scripts:');
    log('   "test": "vitest"');
    log('   "test:run": "vitest run"');
    log('   "test:coverage": "vitest run --coverage"');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Jest config file banned - migrate to Vitest per CLAUDE.md',
      },
    };
  }

  // Check content for Jest usage
  if (content && containsJestUsage(content)) {
    logBlocked(
      'Jest usage detected',
      'Vitest is the ONLY approved test framework. When test requests arise: If project has Jest: Migrate to Vitest first.'
    );
    log('');
    log('MIGRATION STEPS:');
    log('1. Uninstall Jest:');
    log('   npm uninstall jest @types/jest ts-jest jest-environment-jsdom');
    log('');
    log('2. Install Vitest:');
    log('   npm install -D vitest @vitest/coverage-v8');
    log('');
    log('3. Replace imports:');
    log('   - import { jest } from "@jest/globals"  →  import { vi } from "vitest"');
    log('   - jest.fn()  →  vi.fn()');
    log('   - jest.mock()  →  vi.mock()');
    log('');
    log('4. Update config:');
    log('   - Delete jest.config.js');
    log('   - Create vitest.config.ts');
    log('');
    log('5. Update package.json scripts:');
    log('   "test": "vitest"');
    log('   "test:run": "vitest run"');
    log('   "test:coverage": "vitest run --coverage"');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Jest usage banned - migrate to Vitest per CLAUDE.md',
      },
    };
  }

  logAllowed('No Jest usage detected');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('vitest-migration-enforcer', 'PreToolUse', vitestMigrationEnforcerHook);

export default vitestMigrationEnforcerHook;
