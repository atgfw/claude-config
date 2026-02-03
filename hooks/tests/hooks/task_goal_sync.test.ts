/**
 * Tests for task-goal synchronization hook
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  taskGoalSync,
  getCurrentTaskGoal,
  isTaskCurrentFocus,
} from '../../src/hooks/task_goal_sync.js';
import {
  loadGoalStack,
  saveGoalStack,
  createEmptyStack,
  pushGoal,
  createIssueGoal,
} from '../../src/session/goal_stack.js';

let tempDir: string;
let origClaudeDir: string | undefined;
let origSessionId: string | undefined;
const TEST_SESSION_ID = 'test-session-task-goal-sync';

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  origSessionId = process.env['CLAUDE_SESSION_ID'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-goal-sync-test-'));
  fs.mkdirSync(path.join(tempDir, 'ledger'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'sessions', TEST_SESSION_ID), { recursive: true });
  process.env['CLAUDE_DIR'] = tempDir;
  process.env['CLAUDE_SESSION_ID'] = TEST_SESSION_ID;
});

afterAll(() => {
  if (origClaudeDir !== undefined) {
    process.env['CLAUDE_DIR'] = origClaudeDir;
  } else {
    delete process.env['CLAUDE_DIR'];
  }
  if (origSessionId !== undefined) {
    process.env['CLAUDE_SESSION_ID'] = origSessionId;
  } else {
    delete process.env['CLAUDE_SESSION_ID'];
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Clear session goal stack
  saveGoalStack(createEmptyStack(TEST_SESSION_ID));
});

describe('taskGoalSync', () => {
  describe('TaskCreate', () => {
    it('ignores non-Task tools', async () => {
      const result = await taskGoalSync({
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
      });
      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('notes task creation without pushing goal', async () => {
      const result = await taskGoalSync({
        tool_name: 'TaskCreate',
        tool_input: { subject: 'Implement feature', description: 'Add new feature' },
        tool_output: { id: '123', subject: 'Implement feature' },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('Task created');
      expect(result.hookSpecificOutput.additionalContext).toContain('Implement feature');

      // Goal stack should still be empty (task pushed on in_progress)
      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(0);
    });
  });

  describe('TaskUpdate - in_progress', () => {
    it('pushes task as goal when marked in_progress', async () => {
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: {
          taskId: '123',
          status: 'in_progress',
          subject: 'Implement feature',
        },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('Goal focus set');

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(1);
      expect(stack.stack[0]?.id).toBe('task-123');
      expect(stack.stack[0]?.summary).toBe('Implement feature');
    });

    it('does not duplicate if already in stack', async () => {
      // First push
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
      });

      // Second push (same task)
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
      });

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(1);
    });

    it('uses output subject if input subject missing', async () => {
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '456', status: 'in_progress' },
        tool_output: { subject: 'From output' },
      });

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack[0]?.summary).toBe('From output');
    });
  });

  describe('TaskUpdate - completed', () => {
    it('pops task from goal stack when completed', async () => {
      // First, push a task
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
      });

      // Then complete it
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'completed' },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('Task completed');
      expect(result.hookSpecificOutput.additionalContext).toContain('empty');

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(0);
      expect(stack.history.length).toBe(1);
      expect(stack.history[0]?.completedSuccessfully).toBe(true);
    });

    it('returns focus to parent goal after completion', async () => {
      // Push parent issue goal
      pushGoal(TEST_SESSION_ID, createIssueGoal(42, 'Parent issue'));

      // Push child task
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Child task' },
      });

      // Complete child task
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'completed' },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('Focus returned to');
      expect(result.hookSpecificOutput.additionalContext).toContain('Parent issue');

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(1);
      expect(stack.stack[0]?.summary).toBe('Parent issue');
    });

    it('does nothing if task was not current focus', async () => {
      // Push a different task
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '999', status: 'in_progress', subject: 'Other task' },
      });

      // Try to complete a different task
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'completed' },
      });

      // Should not have additional context (no pop happened)
      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();

      // Original task still in stack
      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(1);
      expect(stack.stack[0]?.id).toBe('task-999');
    });
  });

  describe('TaskUpdate - deleted', () => {
    it('removes task from goal stack when deleted', async () => {
      // Push a task
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
      });

      // Delete it
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'deleted' },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('deleted');

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(0);
      expect(stack.history[0]?.completedSuccessfully).toBe(false);
    });
  });

  describe('TaskUpdate - pending', () => {
    it('removes task from goal stack when returned to pending', async () => {
      // Push a task
      await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
      });

      // Return to pending
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', status: 'pending' },
      });

      expect(result.hookSpecificOutput.additionalContext).toContain('pending');

      const stack = loadGoalStack(TEST_SESSION_ID);
      expect(stack.stack.length).toBe(0);
    });
  });

  describe('no status change', () => {
    it('does nothing when no status in update', async () => {
      const result = await taskGoalSync({
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '123', subject: 'New subject' },
      });

      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });
});

describe('getCurrentTaskGoal', () => {
  it('returns null when no task goal', () => {
    const goal = getCurrentTaskGoal(TEST_SESSION_ID);
    expect(goal).toBeNull();
  });

  it('returns current task goal', async () => {
    await taskGoalSync({
      tool_name: 'TaskUpdate',
      tool_input: { taskId: '123', status: 'in_progress', subject: 'My task' },
    });

    const goal = getCurrentTaskGoal(TEST_SESSION_ID);
    expect(goal).not.toBeNull();
    expect(goal?.summary).toBe('My task');
  });

  it('returns null if current goal is not a task', () => {
    pushGoal(TEST_SESSION_ID, createIssueGoal(42, 'Issue'));

    const goal = getCurrentTaskGoal(TEST_SESSION_ID);
    expect(goal).toBeNull();
  });
});

describe('isTaskCurrentFocus', () => {
  it('returns false when stack is empty', () => {
    expect(isTaskCurrentFocus('123', TEST_SESSION_ID)).toBe(false);
  });

  it('returns true when task is current focus', async () => {
    await taskGoalSync({
      tool_name: 'TaskUpdate',
      tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
    });

    expect(isTaskCurrentFocus('123', TEST_SESSION_ID)).toBe(true);
  });

  it('returns false for different task', async () => {
    await taskGoalSync({
      tool_name: 'TaskUpdate',
      tool_input: { taskId: '123', status: 'in_progress', subject: 'Task' },
    });

    expect(isTaskCurrentFocus('456', TEST_SESSION_ID)).toBe(false);
  });
});
