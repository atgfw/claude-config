/**
 * Tests for Primordial Pipeline Gate Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { primordialPipelineGateHook } from '../src/hooks/primordial_pipeline_gate.js';
import type { PreToolUseInput } from '../src/types.js';

// Mock console.error to suppress hook logging during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createInput(filePath: string): PreToolUseInput {
  return {
    tool_name: 'Write',
    tool_input: {
      file_path: filePath,
      content: 'test content',
    },
  };
}

describe('primordialPipelineGateHook', () => {
  describe('exempt files', () => {
    it('allows spec files', async () => {
      const input = createInput('/project/openspec/design.md');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows test files', async () => {
      const input = createInput('/project/tests/validate.test.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows fixture files', async () => {
      const input = createInput('/project/tests/fixtures/input.json');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows markdown files', async () => {
      const input = createInput('/project/README.md');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows config files', async () => {
      const input = createInput('/project/vitest.config.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows package.json', async () => {
      const input = createInput('/project/package.json');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows .env files', async () => {
      const input = createInput('/project/.env');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows yaml files', async () => {
      const input = createInput('/project/config.yaml');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('non-implementation files', () => {
    it('allows files outside implementation patterns', async () => {
      const input = createInput('/project/data/sample.txt');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('new entities', () => {
    it('allows creation of new entities not in registry', async () => {
      const input = createInput('/project/src/code-nodes/newNode.ts');
      const result = await primordialPipelineGateHook(input);
      // New entities are allowed (they start as untested)
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('entity type detection', () => {
    it('detects code-node type', async () => {
      const input = createInput('/project/src/code-nodes/validate.ts');
      const result = await primordialPipelineGateHook(input);
      // Allow since not in registry (new entity)
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('detects subworkflow type', async () => {
      const input = createInput('/project/src/subworkflows/processOrder.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('detects agent type', async () => {
      const input = createInput('/project/src/agents/chatAgent.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('missing file path', () => {
    it('allows when no file path provided', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: null,
      };
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows when tool_input is not an object', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: 'string value',
      };
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('implementation file patterns', () => {
    const implementationPaths = [
      '/project/src/utils/helper.ts',
      '/project/lib/core/engine.ts',
      '/project/app/routes/api.ts',
      '/project/components/Button.tsx',
      '/project/services/auth.ts',
      '/project/api/endpoints.ts',
      '/project/controllers/user.ts',
      '/project/models/User.ts',
      '/project/helpers/format.ts',
    ];

    it.each(implementationPaths)('recognizes %s as implementation code', async (filePath) => {
      const input = createInput(filePath);
      const result = await primordialPipelineGateHook(input);
      // New entities are allowed
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('Windows paths', () => {
    it('handles Windows-style paths', async () => {
      const input = createInput('C:\\Users\\dev\\project\\src\\code-nodes\\validate.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('handles Windows test paths as exempt', async () => {
      const input = createInput('C:\\Users\\dev\\project\\tests\\validate.test.ts');
      const result = await primordialPipelineGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });
});
