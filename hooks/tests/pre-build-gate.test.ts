/**
 * Pre-Build Gate Hook Tests
 * TDD: Verify governance pre-requisites before BUILD phase
 */

import * as fs from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { preBuildGateHook } from '../src/hooks/pre_build_gate.js';
import type { PreToolUseInput } from '../src/types.js';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

describe('Pre-Build Gate Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Spec/Design Files (Should Always Allow)', () => {
    it('should allow writes to openspec/ directory', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/openspec/changes/feature/design.md',
          content: '# Design Spec',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to specs/ directory', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/specs/feature/spec.md',
          content: '# Spec',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to tests/fixtures/', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/fixtures/mock-data.json',
          content: '{}',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to .md files', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/README.md',
          content: '# README',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to PROJECT-DIRECTIVE.md', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/PROJECT-DIRECTIVE.md',
          content: '# PROJECT DIRECTIVE',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to test files', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/feature.test.ts',
          content: 'describe("test", () => {});',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Implementation Files (Requires Gate Check)', () => {
    it('should block src/ writes when PROJECT-DIRECTIVE.md is missing', async () => {
      // Mock: project root found (package.json exists) but no PROJECT-DIRECTIVE.md
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return false;
        if (pathStr.includes('openspec')) return false;
        return false;
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/src/index.ts',
          content: 'export const foo = 1;',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('PROJECT-DIRECTIVE.md');
    });

    it('should block lib/ writes when enforcer audits are PENDING', async () => {
      // Mock: PROJECT-DIRECTIVE.md exists, openspec exists with PENDING audits
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return true;
        if (pathStr.endsWith('openspec')) return true;
        return false;
      });

      vi.mocked(fs.readdirSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.endsWith('openspec')) {
          return [
            { name: 'changes', isDirectory: () => true, isFile: () => false },
          ] as unknown as fs.Dirent[];
        }

        if (pathStr.includes('changes')) {
          return [
            { name: 'design.md', isDirectory: () => false, isFile: () => true },
          ] as unknown as fs.Dirent[];
        }

        return [];
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = p.toString();
        if (pathStr.includes('design.md')) {
          return '## Node Spec\n- [ ] Plain English Check: PENDING\n- [ ] Input Completeness: PENDING';
        }

        return '';
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/lib/utils.ts',
          content: 'export const utils = {};',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('PENDING');
    });

    it('should allow implementation writes when all pre-requisites met', async () => {
      // Mock: PROJECT-DIRECTIVE.md exists, no PENDING audits
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return true;
        if (pathStr.endsWith('openspec')) return true;
        return false;
      });

      vi.mocked(fs.readdirSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.endsWith('openspec')) {
          return [
            { name: 'changes', isDirectory: () => true, isFile: () => false },
          ] as unknown as fs.Dirent[];
        }

        if (pathStr.includes('changes')) {
          return [
            { name: 'design.md', isDirectory: () => false, isFile: () => true },
          ] as unknown as fs.Dirent[];
        }

        return [];
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = p.toString();
        if (pathStr.includes('design.md')) {
          // All audits complete (checked boxes)
          return '## Node Spec\n- [x] Plain English Check: COMPLETE\n- [x] Input Completeness: COMPLETE';
        }

        return '';
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/src/feature.ts',
          content: 'export const feature = {};',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge Cases', () => {
    it('should allow when no file path provided', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to node_modules (excluded)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/node_modules/package/index.js',
          content: 'module.exports = {};',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to global .claude directory', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/.claude/hooks/src/index.ts',
          content: 'export {};',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle project root not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/orphan/src/file.ts',
          content: 'code',
        },
      };

      const output = await preBuildGateHook(input);

      // When project root cannot be found, it still blocks (PROJECT-DIRECTIVE.md cannot be verified)
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('PROJECT-DIRECTIVE.md');
    });
  });

  describe('Path Patterns', () => {
    it('should detect app/ as implementation code', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return false;
        return false;
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/app/page.tsx',
          content: 'export default function Page() {}',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should detect components/ as implementation code', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return false;
        return false;
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/components/Button.tsx',
          content: 'export const Button = () => <button />;',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should detect temp/code-nodes/ as implementation code', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = p.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('PROJECT-DIRECTIVE.md')) return false;
        return false;
      });

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/temp/code-nodes/transform.js',
          content: 'module.exports = {};',
        },
      };

      const output = await preBuildGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });
});
