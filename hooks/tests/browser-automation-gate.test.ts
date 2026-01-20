/**
 * Browser Automation Gate Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { browserAutomationGateHook } from '../src/hooks/browser_automation_gate.js';
import type { PreToolUseInput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock the utils module
vi.mock('../src/utils.js', async () => {
  const actual = (await vi.importActual('../src/utils.js')) as typeof utils;
  return {
    ...actual,
    isScraplingAvailable: vi.fn(),
    isScraplingConfigured: vi.fn(),
    getMcpServerHealth: vi.fn(),
  };
});

describe('Browser Automation Gate Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Interaction Tools Always Allowed', () => {
    it('should allow Playwright click (interaction tool)', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_click',
        tool_input: { selector: '#button' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Interaction');
    });

    it('should allow Playwright type (interaction tool)', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_type',
        tool_input: { selector: '#input', text: 'hello' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Playwright screenshot (interaction tool)', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_screenshot',
        tool_input: {},
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Fetch Tools With Scrapling Suggestion', () => {
    it('should allow Playwright navigate but suggest Scrapling when healthy', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(output.hookSpecificOutput.permissionDecisionReason?.toLowerCase()).toContain(
        'scrapling'
      );
    });

    it('should allow Playwright snapshot but suggest Scrapling when healthy', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_snapshot',
        tool_input: {},
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Playwright Allowed When Scrapling Unavailable', () => {
    it('should allow Playwright when Scrapling is not healthy', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(false);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('unknown');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Playwright when Scrapling not configured', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(false);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(false);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('unknown');

      const input: PreToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Non-Playwright Tools Pass Through', () => {
    it('should allow non-Playwright tools without intervention', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Scrapling tools', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__scrapling__s-fetch-page',
        tool_input: { url: 'https://example.com' },
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow n8n tools', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool name', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: '',
        tool_input: {},
      };

      const output = await browserAutomationGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle case variations in tool names', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);
      vi.mocked(utils.isScraplingConfigured).mockReturnValue(true);
      vi.mocked(utils.getMcpServerHealth).mockReturnValue('healthy');

      const input: PreToolUseInput = {
        tool_name: 'MCP__PLAYWRIGHT__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await browserAutomationGateHook(input);

      // Caught by lowercase check, allowed but with suggestion
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
