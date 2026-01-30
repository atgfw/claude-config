import { describe, it, expect } from 'vitest';
import { ghostFileDetectorHook } from '../../src/governance/ghost_file_detector.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('ghostFileDetector', () => {
  it('should warn when reading governance.yaml', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/governance.yaml',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('ghost file');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('LIVE APIs');
  });

  it('should warn when reading registry.yaml', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/registry.yaml',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('ghost file');
  });

  it('should warn when reading agent-manifest.yaml', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/agent-manifest.yaml',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('ghost file');
  });

  it('should provide API suggestions in warning', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/governance.yml',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('n8n_list_workflows');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('list_agents');
  });

  it('should allow normal file reads without warning', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/path/to/src/index.ts',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow non-Read operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/governance.yaml',
      },
    };

    const result = await ghostFileDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });
});
