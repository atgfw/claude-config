/**
 * Bun Enforcer Hook Tests
 *
 * Tests for the hook that blocks npm/node/npx commands,
 * requiring bun equivalents instead.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bunEnforcerHook, detectBlockedCommands } from '../src/hooks/bun_enforcer.js';
import type { PreToolUseInput } from '../src/types.js';

// Mock the utils module to capture log output
vi.mock('../src/utils.js', () => ({
  logTerse: vi.fn(),
}));

describe('detectBlockedCommands - npm commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block npm install', () => {
    const result = detectBlockedCommands('npm install express');
    expect(result.blocked).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    const hasBunInstall = result.matches.some((m) => m.replacement === 'bun install');
    expect(hasBunInstall).toBe(true);
  });

  it('should block npm i (shorthand)', () => {
    const result = detectBlockedCommands('npm i lodash');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun install');
  });

  it('should block npm run', () => {
    const result = detectBlockedCommands('npm run build');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun run');
  });

  it('should block npm test', () => {
    const result = detectBlockedCommands('npm test');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun test');
  });

  it('should block npm start', () => {
    const result = detectBlockedCommands('npm start');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun run start');
  });

  it('should block npm ci', () => {
    const result = detectBlockedCommands('npm ci');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun install --frozen-lockfile');
  });

  it('should block npm exec', () => {
    const result = detectBlockedCommands('npm exec -- eslint .');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bunx');
  });
});

describe('detectBlockedCommands - npx commands', () => {
  it('should block npx', () => {
    const result = detectBlockedCommands('npx eslint .');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bunx ');
  });

  it('should block npx with package name', () => {
    const result = detectBlockedCommands('npx create-react-app my-app');
    expect(result.blocked).toBe(true);
  });
});

describe('detectBlockedCommands - node commands', () => {
  it('should block node with .js file', () => {
    const result = detectBlockedCommands('node script.js');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun $1');
  });

  it('should block node with .mjs file', () => {
    const result = detectBlockedCommands('node module.mjs');
    expect(result.blocked).toBe(true);
  });

  it('should block node -e', () => {
    const result = detectBlockedCommands('node -e "console.log(1)"');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun -e');
  });

  it('should block node --eval', () => {
    const result = detectBlockedCommands('node --eval "console.log(1)"');
    expect(result.blocked).toBe(true);
    expect(result.matches[0].replacement).toBe('bun -e');
  });
});

describe('detectBlockedCommands - allowed exceptions', () => {
  it('should allow npm --version', () => {
    const result = detectBlockedCommands('npm --version');
    expect(result.blocked).toBe(false);
  });

  it('should allow npm -v', () => {
    const result = detectBlockedCommands('npm -v');
    expect(result.blocked).toBe(false);
  });

  it('should allow npm config get', () => {
    const result = detectBlockedCommands('npm config get registry');
    expect(result.blocked).toBe(false);
  });

  it('should allow reading package.json', () => {
    const result = detectBlockedCommands('cat package.json');
    expect(result.blocked).toBe(false);
  });
});

describe('detectBlockedCommands - non-npm/node commands', () => {
  it('should allow git commands', () => {
    const result = detectBlockedCommands('git status');
    expect(result.blocked).toBe(false);
  });

  it('should allow bun commands', () => {
    const result = detectBlockedCommands('bun install');
    expect(result.blocked).toBe(false);
  });

  it('should allow bunx commands', () => {
    const result = detectBlockedCommands('bunx eslint .');
    expect(result.blocked).toBe(false);
  });

  it('should allow ls commands', () => {
    const result = detectBlockedCommands('ls -la');
    expect(result.blocked).toBe(false);
  });
});

describe('bunEnforcerHook', () => {
  it('should allow non-Bash tools', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: { file_path: '/some/file.ts' },
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow Bash commands without npm/node', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should block npm install', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: { command: 'npm install express' },
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('bun install');
  });

  it('should block npx', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: { command: 'npx eslint .' },
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('bunx');
  });

  it('should allow empty command', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {},
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow npm version check', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: { command: 'npm --version' },
    };

    const output = await bunEnforcerHook(input);

    expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
