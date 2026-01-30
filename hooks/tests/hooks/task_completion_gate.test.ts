/**
 * Task Completion Gate Hook Tests
 *
 * P0-CRITICAL: Blocks task completion without production validation evidence.
 * "Code exists" is never sufficient - systems must be verified working.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskCompletionGateHook } from '../../src/hooks/task_completion_gate.js';
import type { PreToolUseInput } from '../../src/types.js';

describe('taskCompletionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Non-completion operations (allowed)', () => {
    it('should allow TaskUpdate with status=in_progress', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'in_progress',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow TaskUpdate with status=pending', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'pending',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow TaskCreate operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskCreate',
        tool_input: {
          subject: 'New task',
          description: 'Do something',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow non-task tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test.ts',
          content: 'test',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Completion without evidence (blocked)', () => {
    it('should block completion with no metadata', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('evidence');
    });

    it('should block completion with empty metadata', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {},
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block completion with only description update', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          description: 'Updated description',
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Completion with executionId (allowed)', () => {
    it('should allow completion with n8n executionId', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            executionId: 'n8n-exec-456',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow completion with execution_id (snake_case)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            execution_id: 'elevenlabs-conv-789',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Completion with userConfirmed (allowed)', () => {
    it('should allow completion with userConfirmed=true', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            userConfirmed: true,
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block completion with userConfirmed=false', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            userConfirmed: false,
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Completion with testPassed (allowed)', () => {
    it('should allow completion with valid testPassed object', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            testPassed: {
              testId: 'vitest-run-abc',
              timestamp: Date.now(),
            },
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block completion with testPassed missing testId', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            testPassed: {
              timestamp: Date.now(),
            },
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Completion with evidencePath (allowed)', () => {
    it('should allow completion with screenshot path', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            evidencePath: '/screenshots/task-123-verified.png',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow completion with log file path', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            evidencePath: '/logs/execution-output.log',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block completion with empty evidencePath', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            evidencePath: '',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Anti-patterns (blocked)', () => {
    it('should block "tests pass" without real execution', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            note: 'All tests pass',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block "file written successfully" without verification', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            note: 'File written successfully',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block "deployed" without execution verification', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
          metadata: {
            note: 'Deployed to production',
          },
        },
      };

      const result = await taskCompletionGateHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Error message quality', () => {
    it('should provide actionable guidance on block', async () => {
      const input: PreToolUseInput = {
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: 'task-123',
          status: 'completed',
        },
      };

      const result = await taskCompletionGateHook(input);

      const reason = result.hookSpecificOutput.permissionDecisionReason ?? '';
      expect(reason).toContain('executionId');
      expect(reason).toContain('userConfirmed');
    });
  });
});
