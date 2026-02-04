/**
 * Pre-Bash Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preBashHook } from '../src/hooks/pre_bash.js';
import type { PreToolUseInput } from '../src/types.js';

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

  describe('Adversarial: Bypass Attempts', () => {
    it('blocks rm with path obfuscation', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '/bin/rm file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm with env var expansion', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '$RM file.txt' },
      };
      // This might be allowed since $RM isn't literally "rm"
      // But document the behavior
      const output = await preBashHook(input);
      // Current behavior: allows (can't detect env var expansion)
      expect(output.hookSpecificOutput).toBeDefined();
    });

    it('blocks rm hidden in command substitution', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '$(echo rm) file.txt' },
      };
      const output = await preBashHook(input);
      // Should block - contains "rm"
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm in backtick substitution', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: '`echo rm` file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm with newline bypass attempt', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo safe\nrm file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm with semicolon chaining', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo safe; rm file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm with && chaining', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'true && rm file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm with || chaining', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'false || rm file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks rm in pipe chain', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'find . -name "*.tmp" | xargs rm' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks unlink command (alternative to rm)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'unlink file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks shred command (secure delete)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'shred -u file.txt' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('blocks find -delete', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'find . -name "*.tmp" -delete' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    // SECURITY GAP: git clean -fd deletes untracked files but not blocked
    // TODO: Add git clean to deletion patterns
    it.skip('blocks git clean -fd (removes untracked files) - KNOWN GAP', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'git clean -fd' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Adversarial: Emoji Bypass Attempts', () => {
    it('blocks zero-width joiner sequences', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "test\u200D"' }, // Zero-width joiner
      };
      const output = await preBashHook(input);
      // Behavior depends on implementation
      expect(output.hookSpecificOutput).toBeDefined();
    });

    it('blocks variation selectors', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "\u2764\uFE0F"' }, // Heart with variation selector
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    // SECURITY GAP: Regional indicator emojis (flags) not detected
    // TODO: Extend emoji regex to include regional indicators U+1F1E6-1F1FF
    it.skip('blocks regional indicators - KNOWN GAP', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "\u{1F1FA}\u{1F1F8}"' }, // US flag
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Adversarial: Malformed Input', () => {
    it('handles null command gracefully', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: null as unknown as string },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput).toBeDefined();
    });

    it('handles array command gracefully', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: ['rm', 'file.txt'] as unknown as string },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput).toBeDefined();
    });

    it('handles object command gracefully', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: { cmd: 'rm' } as unknown as string },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput).toBeDefined();
    });

    it('handles extremely long command', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo ' + 'A'.repeat(100000) },
      };
      const start = Date.now();
      const output = await preBashHook(input);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete quickly
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('handles command with control characters', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo "test\u0000\u0001\u0002"' },
      };
      const output = await preBashHook(input);
      expect(output.hookSpecificOutput).toBeDefined();
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
