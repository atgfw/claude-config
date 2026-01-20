/**
 * Vitest Migration Enforcer Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vitestMigrationEnforcerHook } from '../src/hooks/vitest_migration_enforcer.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Vitest Migration Enforcer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Jest imports blocking', () => {
    it('should block @jest/globals import', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'import { jest } from "@jest/globals";\n\ntest("example", () => {});',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Jest usage banned');
    });

    it('should block jest import', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'import jest from "jest";\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block jest destructured import', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'import { jest, expect } from "@jest/globals";\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Jest require statements blocking', () => {
    it('should block jest require', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.js',
          content: 'const jest = require("jest");\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block @jest/globals require', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.js',
          content: 'const { jest } = require("@jest/globals");\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Jest globals blocking', () => {
    it('should block jest.fn()', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'const mockFn = jest.fn();\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block test.each', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'test.each([1, 2, 3])("test %i", (num) => {});',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Jest config files blocking', () => {
    it('should block jest.config.js creation', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/jest.config.js',
          content: 'module.exports = { testEnvironment: "node" };',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block jest.config.ts creation', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/jest.config.ts',
          content: 'export default { testEnvironment: "node" };',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Jest package.json dependencies blocking', () => {
    it('should block package.json with jest dependency', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/package.json',
          content: JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
            },
          }),
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block package.json with @jest dependencies', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/package.json',
          content: JSON.stringify({
            devDependencies: {
              '@jest/globals': '^29.0.0',
            },
          }),
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block package.json with ts-jest', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/package.json',
          content: JSON.stringify({
            devDependencies: {
              'ts-jest': '^29.0.0',
            },
          }),
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Vitest usage (allowed)', () => {
    it('should allow vitest imports', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'import { describe, it, expect, vi } from "vitest";\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow vi.fn()', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/example.test.ts',
          content: 'const mockFn = vi.fn();\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow vitest.config.ts', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/vitest.config.ts',
          content: 'import { defineConfig } from "vitest/config";\n',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow package.json with vitest', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/package.json',
          content: JSON.stringify({
            devDependencies: {
              vitest: '^1.0.0',
            },
          }),
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edit tool support', () => {
    it('should block Edit with Jest usage', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '/test/example.test.ts',
          old_string: 'const mockFn = vi.fn();',
          new_string: 'const mockFn = jest.fn();',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow Edit with Vitest usage', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '/test/example.test.ts',
          old_string: 'const mockFn = jest.fn();',
          new_string: 'const mockFn = vi.fn();',
        },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Non-file tools (ignored)', () => {
    it('should allow Bash commands', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Read tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/example.test.ts' },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge cases', () => {
    it('should allow empty content', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test/example.ts', content: '' },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow missing content', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test/example.ts' },
      };

      const output = await vitestMigrationEnforcerHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
