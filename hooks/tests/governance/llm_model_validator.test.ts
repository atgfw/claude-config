/**
 * LLM Model Validator Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreToolUseInput } from '../../src/types.js';

vi.mock('../../src/utils.js', () => ({
  log: vi.fn(),
  logBlocked: vi.fn(),
  logAllowed: vi.fn(),
  logWarn: vi.fn(),
  getClaudeDir: () => '/mock/.claude',
}));

vi.mock('../../src/runner.js', () => ({
  registerHook: vi.fn(),
}));

describe('llmModelValidator', () => {
  let llmModelValidatorHook: (
    input: PreToolUseInput
  ) => Promise<import('../../src/types.js').PreToolUseOutput>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/governance/llm_model_validator.js');
    llmModelValidatorHook = mod.llmModelValidatorHook;
  });

  it('allows Write with no banned model strings', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.ts',
        content: 'const model = "gpt-5.2";\nexport default model;',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('blocks Write containing gpt-4o', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.ts',
        content: 'const model = "gpt-4o";\nexport default model;',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('gpt-4o');
  });

  it('blocks Edit containing gpt-4.1', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/config.ts',
        new_string: 'const model = "gpt-4.1-mini";',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('blocks content with claude-2', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/agent.ts',
        content: 'Use claude-2 for this task',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('blocks content with gpt-3.5-turbo', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.json',
        content: '{"model": "gpt-3.5-turbo"}',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('allows files in old/ directory', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/old/legacy-config.ts',
        content: 'const model = "gpt-4o";',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('skips non-Write/Edit tools', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/project/config.ts',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('allows approved model gpt-5.2', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.ts',
        content: 'const model = "gpt-5.2";',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('allows approved model gemini-3-flash-preview', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.ts',
        content: 'const model = "gemini-3-flash-preview";',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('lists approved models in denial reason', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/config.ts',
        content: 'Use gpt-4o-mini for cheap inference',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('gpt-5.2');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('gemini-3-flash-preview');
  });

  it('blocks claude-instant references', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/prompt.md',
        content: 'Send to claude-instant for fast response',
      },
    };

    const result = await llmModelValidatorHook(input);
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
