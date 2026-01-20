/**
 * Inline Script Validator Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inlineScriptValidatorHook } from '../src/hooks/inline_script_validator.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Inline Script Validator Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Node -e with complex content', () => {
    it('should block node -e with JSON', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'node -e "console.log(JSON.stringify({ key: \\"value\\" }))"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
        'Complex inline scripts banned'
      );
    });

    it('should block node --eval with template literals', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'node --eval "const x = `template ${var}`; console.log(x)"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block node -e with array literals', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'node -e "console.log([1, 2, 3])"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow simple node -e without complex syntax', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'node -e "console.log(123)"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('PowerShell complex commands', () => {
    it('should block powershell -Command with $ variables', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'powershell -Command "$data = Get-Content file.json"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block powershell -C with variable substitution', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'powershell -C "$env:PATH -split \';\'"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow simple powershell commands without variables', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'powershell -Command "Copy-Item source target -Force"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Multiple quote levels', () => {
    it('should block commands with triple quote nesting', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "outer \'middle "inner" middle\' outer"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow commands with single level quotes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "Hello World"' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Heredoc patterns', () => {
    it('should block heredoc with backticks', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'cat <<EOF\nconst x = `template`;\nEOF' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block heredoc with $() substitution', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'cat <<EOF\necho $(date)\nEOF' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow simple heredoc without special chars', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'cat <<EOF\nHello World\nEOF' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Safe patterns', () => {
    it('should allow node script.js', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'node /tmp/script.js' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow npm commands', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow git commands', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'git status' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge cases', () => {
    it('should allow empty command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '' },
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow missing command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: {},
      };

      const output = await inlineScriptValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
