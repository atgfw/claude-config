import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toolFilterHook } from '../../src/governance/tool_filter.js';
import type { PreToolUseInput } from '../../src/types.js';

const CONFIG_PATH = join(homedir(), '.claude', 'tool-filter-config.json');
const BACKUP_PATH = CONFIG_PATH + '.test-backup';

describe('tool_filter hook', () => {
  let originalConfig: string | undefined = null;

  beforeEach(() => {
    // Backup existing config if it exists
    if (existsSync(CONFIG_PATH)) {
      originalConfig = readFileSync(CONFIG_PATH, 'utf8');
      writeFileSync(BACKUP_PATH, originalConfig);
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig === null) {
      // Remove test config if original didn't exist
      if (existsSync(CONFIG_PATH)) {
        unlinkSync(CONFIG_PATH);
      }
    } else {
      writeFileSync(CONFIG_PATH, originalConfig);
      if (existsSync(BACKUP_PATH)) {
        unlinkSync(BACKUP_PATH);
      }
    }
  });

  it('blocks tools matching blocklist pattern', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        mode: 'blocklist',
        patterns: [
          {
            pattern: 'mcp__servicetitan-mcp__*',
            action: 'block',
            reason: 'ServiceTitan tools are blocked',
          },
        ],
      })
    );

    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__get_customer',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('ServiceTitan');
  });

  it('allows tools not matching blocklist pattern', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        mode: 'blocklist',
        patterns: [
          {
            pattern: 'mcp__servicetitan-mcp__*',
            action: 'block',
          },
        ],
      })
    );

    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('allows tools in exceptions list', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        mode: 'blocklist',
        patterns: [
          {
            pattern: 'mcp__servicetitan-mcp__*',
            action: 'block',
            exceptions: ['mcp__servicetitan-mcp__get_customer'],
          },
        ],
      })
    );

    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__get_customer',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('blocks other tools when exception exists', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        mode: 'blocklist',
        patterns: [
          {
            pattern: 'mcp__servicetitan-mcp__*',
            action: 'block',
            exceptions: ['mcp__servicetitan-mcp__get_customer'],
          },
        ],
      })
    );

    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__create_job',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('handles missing config gracefully', async () => {
    // Remove config if it exists
    if (existsSync(CONFIG_PATH)) {
      unlinkSync(CONFIG_PATH);
    }

    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('supports wildcard patterns', async () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({
        mode: 'blocklist',
        patterns: [
          {
            pattern: 'mcp__*__delete_*',
            action: 'block',
            reason: 'Deletion operations require approval',
          },
        ],
      })
    );

    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__delete_workflow',
      tool_input: {},
    };

    const result = await toolFilterHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Deletion');
  });
});
