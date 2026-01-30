import { describe, it, expect, vi, beforeEach } from 'vitest';
import { staleWorkflowJsonDetectorHook } from '../../src/governance/stale_workflow_json_detector.js';
import type { PreToolUseInput } from '../../src/types.js';

// Mock fs for file content checks
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn((filePath: string) => {
      if (filePath.endsWith('workflow.json') && !filePath.includes('not-workflow')) {
        return JSON.stringify({
          name: 'test_workflow',
          nodes: [{ name: 'start', type: 'n8n-nodes-base.start' }],
          connections: { start: {} },
        });
      }
      if (filePath.includes('package.json')) {
        return JSON.stringify({ name: 'my-project', version: '1.0.0' });
      }
      if (filePath.includes('not-workflow.json')) {
        return JSON.stringify({ key: 'value', list: [1, 2, 3] });
      }
      throw new Error('ENOENT');
    }),
    existsSync: vi.fn(() => true),
  };
});

describe('staleWorkflowJsonDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should warn when reading a workflow JSON in project root', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('workflow JSON');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('source of truth');
  });

  it('should warn when writing a workflow JSON in project root', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/projects/my-n8n-project/workflow.json',
        content: JSON.stringify({
          name: 'test',
          nodes: [],
          connections: {},
        }),
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('workflow JSON');
  });

  it('should allow workflow JSON in temp/ subdirectory', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/temp/workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow workflow JSON in old/ subdirectory', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/old/workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow non-workflow JSON files (package.json)', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/package.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow non-JSON files', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/README.md',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow JSON without workflow structure', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/not-workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow non-file tools', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'ls',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow files in node_modules', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/node_modules/n8n/workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow files in dist/', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Read',
      tool_input: {
        file_path: '/projects/my-n8n-project/dist/workflow.json',
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should detect workflow JSON from Write content even without reading file', async () => {
    // When writing, check the content being written, not the existing file
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/projects/my-n8n-project/new-workflow.json',
        content: JSON.stringify({
          name: 'new_workflow',
          nodes: [{ name: 'webhook', type: 'n8n-nodes-base.webhook' }],
          connections: {},
        }),
      },
    };

    const result = await staleWorkflowJsonDetectorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('workflow JSON');
  });

  it('should skip excluded config filenames', async () => {
    const configFiles = ['tsconfig.json', 'vitest.config.json', 'mcp-registry.json'];

    for (const filename of configFiles) {
      const input: PreToolUseInput = {
        tool_name: 'Read',
        tool_input: {
          file_path: `/projects/my-n8n-project/${filename}`,
        },
      };

      const result = await staleWorkflowJsonDetectorHook(input);
      expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
    }
  });
});
