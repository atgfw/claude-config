/**
 * Pre-Bash Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preBashHook } from '../src/hooks/pre-bash.js';
import type { PreToolUseInput, PreToolUseOutput } from '../src/types.js';

describe('Pre-Bash Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deletion Command Blocking', () => {
    it('should block rm command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'rm file.txt' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Deletion banned');
    });

    it('should block rm -rf command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf /some/path' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block del command (Windows)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'del file.txt' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Remove-Item command (PowerShell)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'Remove-Item -Path ./file.txt' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block rmdir command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'rmdir /s /q folder' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should NOT block mv command (move is allowed)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'mv file.txt old/' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should NOT block commands that contain rm as substring', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "form data"' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Emoji Blocking', () => {
    it('should block command with emoji', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "Hello \u{1F600}"' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Emoji');
    });

    it('should allow command without emoji', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "Hello World"' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Safe Commands', () => {
    it('should allow ls command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow git commands', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'git status' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow npm commands', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'npm install' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow mkdir command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'mkdir -p new_folder' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle missing command in input', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: {},
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should provide suggestions when blocking', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf ./temp' },
      };

      const output = await preBashHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      // The reason should contain guidance about using mv instead
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('old/');
    });
  });
});
