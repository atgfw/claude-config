import { describe, it, expect } from 'vitest';
import { childProjectOverrideDetectorHook } from '../../src/governance/child_project_override_detector.js';
import { PreToolUseInput } from '../../src/types.js';
import * as path from 'node:path';
import * as os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CHILD_PROJECT = path.join(os.homedir(), 'projects', 'my-app');

describe('childProjectOverrideDetector', () => {
  it('should allow Write within .claude directory', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CLAUDE_DIR, '.mcp.json'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should block .mcp.json in child project', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, '.mcp.json'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('.mcp.json');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Spinal Cord');
  });

  it('should block settings.json in child project', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, 'settings.json'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('settings.json');
  });

  it('should block .env in child project', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, '.env'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('.env');
  });

  it('should block hooks/ directory in child project', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, 'hooks', 'my-hook.ts'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('hooks');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Global Hook Supremacy');
  });

  it('should allow normal files in child project', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, 'src', 'index.ts'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow non-Write operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: path.join(CHILD_PROJECT, '.mcp.json'),
      },
    };

    const result = await childProjectOverrideDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
