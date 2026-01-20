import { describe, it, expect } from 'vitest';
import { vitestMigrationEnforcerHook } from '../../src/hooks/vitest_migration_enforcer.js';
import { PreToolUseInput } from '../../src/types.js';

describe('vitestMigrationEnforcer', () => {
  it('should block Jest imports', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/test.ts',
        content: `import { jest } from '@jest/globals';\n\ntest('foo', () => {});`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Jest');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Vitest');
  });

  it('should block jest.fn() usage', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/test.ts',
        content: `const mockFn = jest.fn();`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('jest.fn');
  });

  it('should block jest.mock() usage', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/test.ts',
        content: `jest.mock('./module');`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('jest.mock');
  });

  it('should block jest.config files', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/jest.config.js',
        content: `module.exports = { testEnvironment: 'node' };`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Jest configuration');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('vitest.config.ts');
  });

  it('should provide migration instructions', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/test.ts',
        content: `import { jest } from '@jest/globals';`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('vi.fn()');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('vi.mock()');
  });

  it('should allow Vitest imports', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/test.ts',
        content: `import { describe, it, expect, vi } from 'vitest';\n\nconst mockFn = vi.fn();`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow non-test files', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/index.ts',
        content: `export function foo() {}`,
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow non-Write operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/jest.config.js',
      },
    };

    const result = await vitestMigrationEnforcerHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
