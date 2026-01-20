/**
 * Login Detection Escalator Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loginDetectionEscalatorHook } from '../src/hooks/login_detection_escalator.js';
import type { PostToolUseInput, PostToolUseOutput } from '../src/types.js';

describe('Login Detection Escalator Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login Page Detection - Content Patterns', () => {
    it('should detect login form with password input', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/login' },
        tool_output: '<form><input type="password" name="password"></form>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect "Sign In" text', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__get_page_content',
        tool_input: {},
        tool_output: '<h1>Sign In to Your Account</h1>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect "Log In" text', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://app.example.com' },
        tool_output: '<button>Log In</button>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect OAuth buttons', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com' },
        tool_output: '<button>Sign in with Google</button>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect session expired messages', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/dashboard' },
        tool_output: '<div class="error">Session expired. Please log in again.</div>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect SSO/OAuth patterns', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com' },
        tool_output: '<a href="/oauth/authorize">Continue with SSO</a>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });
  });

  describe('Login Page Detection - URL Patterns', () => {
    it('should detect /login in URL', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/login' },
        tool_output: '<html><body>Welcome</body></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect /auth in URL', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/auth/callback' },
        tool_output: '<html><body></body></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect Google OAuth URLs', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://accounts.google.com/signin' },
        tool_output: '<html><body></body></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect Microsoft OAuth URLs', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://login.microsoftonline.com/common/oauth2' },
        tool_output: '<html><body></body></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });
  });

  describe('No Login Detection', () => {
    it('should not escalate for normal content pages', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/dashboard' },
        tool_output: '<html><body><h1>Dashboard</h1><p>Welcome back!</p></body></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should not escalate for API responses', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://api.example.com/data' },
        tool_output: '{"status": "ok", "data": []}',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should not escalate for empty output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com' },
        tool_output: '',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('Non-Browser Tools', () => {
    it('should not process non-browser tools', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
        tool_output: 'password = "secret"',
      };

      const output = await loginDetectionEscalatorHook(input);

      // Should not escalate even though content contains "password"
      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should not process Bash tools', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'curl https://example.com/login' },
        tool_output: '<html><input type="password"></html>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('Playwright Tool Support', () => {
    it('should detect login for Playwright navigate', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com/login' },
        tool_output: '<form><input type="password"></form>',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });

    it('should detect login for Playwright screenshot with HTML context', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__playwright__browser_snapshot',
        tool_input: {},
        tool_output: { content: '<html><button>Sign In</button></html>' },
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });
  });

  describe('Escalation Message Content', () => {
    it('should include URL in escalation message when available', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://n8n.example.com/login' },
        tool_output: '<input type="password">',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('n8n.example.com');
    });

    it('should include escalation instructions', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/login' },
        tool_output: '<input type="password">',
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain(
        'STOP all browser automation immediately'
      );
      expect(output.hookSpecificOutput.additionalContext).toContain('AskUserQuestion');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null tool_output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com' },
        tool_output: null,
      };

      const output = await loginDetectionEscalatorHook(input);

      // Should not crash
      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });

    it('should handle object tool_output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com/login' },
        tool_output: {
          html: '<form><input type="password"></form>',
          status: 200,
        },
      };

      const output = await loginDetectionEscalatorHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('AUTH_ESCALATION_REQUIRED');
    });
  });
});
