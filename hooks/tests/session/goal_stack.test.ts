/**
 * Tests for session-scoped goal stack management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getSessionId,
  setSessionIdEnv,
  getSessionDir,
  getGoalStackPath,
  ensureSessionDir,
  createEmptyStack,
  loadGoalStack,
  saveGoalStack,
  pushGoal,
  popGoal,
  popGoalById,
  getCurrentGoal,
  getGoalHierarchy,
  hasGlobalOverride,
  loadGlobalOverride,
  formatGoalHierarchy,
  createDefaultFields,
  createTaskGoal,
  createIssueGoal,
  extractFieldsFromDescription,
  type GoalLevel,
  type SessionGoalStack,
} from '../../src/session/goal_stack.js';

// Mock getClaudeDir to use temp directory
vi.mock('../../src/utils.js', () => ({
  getClaudeDir: () => testDir,
}));

let testDir: string;
let testSessionId: string;

beforeEach(() => {
  // Create unique temp directory for each test
  testDir = path.join(process.env['TEMP'] ?? '/tmp', `goal-stack-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'ledger'), { recursive: true });
  testSessionId = `test-session-${Date.now()}`;

  // Clear env var
  delete process.env['CLAUDE_SESSION_ID'];
});

afterEach(() => {
  // Clean up temp directory
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

describe('getSessionId', () => {
  it('should prefer input.session_id when provided', () => {
    const input = { session_id: 'input-session-123', prompt: 'test' };
    expect(getSessionId(input)).toBe('input-session-123');
  });

  it('should fall back to CLAUDE_SESSION_ID env var', () => {
    process.env['CLAUDE_SESSION_ID'] = 'env-session-456';
    expect(getSessionId()).toBe('env-session-456');
  });

  it('should generate from ppid+cwd when no ID available', () => {
    const sessionId = getSessionId();
    expect(sessionId).toMatch(/^session-[a-f0-9]{16}$/);
  });

  it('should generate consistent ID for same ppid+cwd', () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id1).toBe(id2);
  });
});

describe('setSessionIdEnv', () => {
  it('should set CLAUDE_SESSION_ID environment variable', () => {
    setSessionIdEnv('my-session-789');
    expect(process.env['CLAUDE_SESSION_ID']).toBe('my-session-789');
  });
});

describe('session directory management', () => {
  it('should return correct session directory path', () => {
    const dir = getSessionDir('test-123');
    expect(dir).toContain('sessions');
    expect(dir).toContain('test-123');
  });

  it('should return correct goal stack file path', () => {
    const stackPath = getGoalStackPath('test-123');
    expect(stackPath).toContain('goal-stack.json');
  });

  it('should create session directory', () => {
    ensureSessionDir(testSessionId);
    const dir = getSessionDir(testSessionId);
    expect(fs.existsSync(dir)).toBe(true);
  });
});

describe('goal stack CRUD', () => {
  it('should create empty stack with correct structure', () => {
    const stack = createEmptyStack(testSessionId, '/test/dir');
    expect(stack.session_id).toBe(testSessionId);
    expect(stack.working_directory).toBe('/test/dir');
    expect(stack.stack).toEqual([]);
    expect(stack.history).toEqual([]);
  });

  it('should load empty stack when file does not exist', () => {
    const stack = loadGoalStack(testSessionId);
    expect(stack.stack).toEqual([]);
  });

  it('should save and load goal stack', () => {
    const stack = createEmptyStack(testSessionId);
    stack.stack.push(createTaskGoal('1', 'Test task'));
    saveGoalStack(stack);

    const loaded = loadGoalStack(testSessionId);
    expect(loaded.stack.length).toBe(1);
    expect(loaded.stack[0]?.summary).toBe('Test task');
  });
});

describe('stack operations', () => {
  beforeEach(() => {
    ensureSessionDir(testSessionId);
  });

  it('should push goal to stack', () => {
    const goal = createTaskGoal('1', 'First task');
    pushGoal(testSessionId, goal);

    const stack = loadGoalStack(testSessionId);
    expect(stack.stack.length).toBe(1);
    expect(stack.stack[0]?.id).toBe('task-1');
  });

  it('should not push duplicate goals', () => {
    const goal = createTaskGoal('1', 'First task');
    pushGoal(testSessionId, goal);
    pushGoal(testSessionId, goal);

    const stack = loadGoalStack(testSessionId);
    expect(stack.stack.length).toBe(1);
  });

  it('should push newest goal to front (index 0)', () => {
    pushGoal(testSessionId, createTaskGoal('1', 'First'));
    pushGoal(testSessionId, createTaskGoal('2', 'Second'));

    const stack = loadGoalStack(testSessionId);
    expect(stack.stack[0]?.summary).toBe('Second');
    expect(stack.stack[1]?.summary).toBe('First');
  });

  it('should pop goal from stack', () => {
    pushGoal(testSessionId, createTaskGoal('1', 'Task'));
    const popped = popGoal(testSessionId, true);

    expect(popped?.summary).toBe('Task');
    const stack = loadGoalStack(testSessionId);
    expect(stack.stack.length).toBe(0);
    expect(stack.history.length).toBe(1);
    expect(stack.history[0]?.completedSuccessfully).toBe(true);
  });

  it('should pop specific goal by ID', () => {
    pushGoal(testSessionId, createTaskGoal('1', 'First'));
    pushGoal(testSessionId, createTaskGoal('2', 'Second'));

    // Should only pop if it's the current focus (index 0)
    const poppedWrong = popGoalById(testSessionId, 'task-1', true);
    expect(poppedWrong).toBeNull();

    const poppedCorrect = popGoalById(testSessionId, 'task-2', true);
    expect(poppedCorrect?.summary).toBe('Second');
  });

  it('should return null when popping empty stack', () => {
    const popped = popGoal(testSessionId, true);
    expect(popped).toBeNull();
  });

  it('should get current goal', () => {
    pushGoal(testSessionId, createTaskGoal('1', 'Current'));
    const current = getCurrentGoal(testSessionId);
    expect(current?.summary).toBe('Current');
  });

  it('should return null for empty stack current goal', () => {
    const current = getCurrentGoal(testSessionId);
    expect(current).toBeNull();
  });

  it('should get goal hierarchy in display order', () => {
    pushGoal(testSessionId, createIssueGoal(42, 'Issue'));
    pushGoal(testSessionId, createTaskGoal('1', 'Task'));

    const hierarchy = getGoalHierarchy(testSessionId);
    // Hierarchy should be: issue first (higher level), task last (current focus)
    expect(hierarchy[0]?.type).toBe('issue');
    expect(hierarchy[1]?.type).toBe('task');
  });
});

describe('global override detection', () => {
  it('should return false when no global goal file', () => {
    expect(hasGlobalOverride()).toBe(false);
  });

  it('should return true when global goal has content', () => {
    const goalPath = path.join(testDir, 'ledger', 'active-goal.json');
    fs.writeFileSync(
      goalPath,
      JSON.stringify({
        goal: 'Test goal',
        summary: 'Test summary',
        fields: {
          who: 'test',
          what: 'test',
          when: 'test',
          where: 'test',
          why: 'test',
          how: 'test',
        },
      })
    );

    expect(hasGlobalOverride()).toBe(true);
  });

  it('should return false when global goal is empty', () => {
    const goalPath = path.join(testDir, 'ledger', 'active-goal.json');
    fs.writeFileSync(goalPath, JSON.stringify({ goal: null, summary: null }));

    expect(hasGlobalOverride()).toBe(false);
  });

  it('should load global override as GoalLevel', () => {
    const goalPath = path.join(testDir, 'ledger', 'active-goal.json');
    fs.writeFileSync(
      goalPath,
      JSON.stringify({
        goal: 'Global goal',
        summary: 'Global summary',
        fields: {
          who: 'global',
          what: 'goal',
          when: 'now',
          where: 'here',
          why: 'because',
          how: 'magic',
        },
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );

    const override = loadGlobalOverride();
    expect(override?.id).toBe('global-override');
    expect(override?.type).toBe('epic');
    expect(override?.summary).toBe('Global summary');
    expect(override?.source.manual).toBe(true);
  });
});

describe('formatGoalHierarchy', () => {
  beforeEach(() => {
    ensureSessionDir(testSessionId);
  });

  it('should return empty message for no goals', () => {
    const formatted = formatGoalHierarchy(testSessionId);
    expect(formatted).toContain('NO ACTIVE GOAL SET');
  });

  it('should format single goal', () => {
    pushGoal(testSessionId, createTaskGoal('1', 'Single task'));
    const formatted = formatGoalHierarchy(testSessionId);

    expect(formatted).toContain('ACTIVE GOAL HIERARCHY');
    expect(formatted).toContain('[TASK]');
    expect(formatted).toContain('Single task');
    expect(formatted).toContain('CURRENT FOCUS');
  });

  it('should format hierarchical goals', () => {
    pushGoal(testSessionId, createIssueGoal(42, 'Parent issue'));
    pushGoal(testSessionId, createTaskGoal('1', 'Child task'));

    const formatted = formatGoalHierarchy(testSessionId);
    expect(formatted).toContain('[ISSUE #42]');
    expect(formatted).toContain('[TASK]');
    expect(formatted).toContain('Child task');
    expect(formatted).toContain('CURRENT FOCUS');
  });

  it('should NOT include global override in hierarchy (session-scoped only)', () => {
    // Global override should NOT bleed into session hierarchy anymore
    const goalPath = path.join(testDir, 'ledger', 'active-goal.json');
    fs.writeFileSync(
      goalPath,
      JSON.stringify({
        goal: 'Epic goal',
        summary: 'Epic summary',
        fields: {
          who: 'all',
          what: 'everything',
          when: 'always',
          where: 'everywhere',
          why: 'reasons',
          how: 'ways',
        },
      })
    );

    pushGoal(testSessionId, createTaskGoal('1', 'Task'));
    const formatted = formatGoalHierarchy(testSessionId);

    // Session goals only - global NOT included
    expect(formatted).toContain('[TASK]');
    expect(formatted).toContain('Task');
    expect(formatted).not.toContain('[EPIC]');
    expect(formatted).not.toContain('Epic summary');
  });
});

describe('goal creation helpers', () => {
  it('should create default fields from summary', () => {
    const fields = createDefaultFields('Test summary');
    expect(fields.who).toBe('Claude Code session');
    expect(fields.what).toBe('Test summary');
  });

  it('should create task goal', () => {
    const goal = createTaskGoal('123', 'Task subject', 'Task description');
    expect(goal.id).toBe('task-123');
    expect(goal.type).toBe('task');
    expect(goal.summary).toBe('Task subject');
    expect(goal.source.claude_task_id).toBe('123');
    expect(goal.pushedBy).toBe('TaskUpdate');
  });

  it('should create issue goal', () => {
    const goal = createIssueGoal(42, 'Issue title', 'Issue body');
    expect(goal.id).toBe('issue-42');
    expect(goal.type).toBe('issue');
    expect(goal.summary).toBe('Issue title');
    expect(goal.source.github_issue).toBe(42);
    expect(goal.pushedBy).toBe('IssueDetection');
  });
});

describe('extractFieldsFromDescription', () => {
  it('should extract 5W1H fields from markdown', () => {
    const description = `**WHO:** The development team
**WHAT:** Implement feature X
**WHEN:** Q1 2026
**WHERE:** Backend service
**WHY:** Customer request
**HOW:** Using TypeScript`;
    const fields = extractFieldsFromDescription(description);

    expect(fields.who).toBe('The development team');
    expect(fields.what).toBe('Implement feature X');
    expect(fields.when).toBe('Q1 2026');
    expect(fields.where).toBe('Backend service');
    expect(fields.why).toBe('Customer request');
    expect(fields.how).toBe('Using TypeScript');
  });

  it('should handle missing fields', () => {
    const description = 'Just a simple description with no structured fields';
    const fields = extractFieldsFromDescription(description);

    // What should be populated from first line
    expect(fields.what).toBe('Just a simple description with no structured fields');
    // Others should be defaults
    expect(fields.who).toBe('Claude Code session');
  });

  it('should handle partial fields', () => {
    const description = `
      WHO: Developer
      WHAT: Fix bug
    `;
    const fields = extractFieldsFromDescription(description);

    expect(fields.who).toBe('Developer');
    expect(fields.what).toBe('Fix bug');
    expect(fields.when).toBe('Current task');
  });
});
