import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createItem,
  renderToGitHubBody,
  renderToTaskCreate,
  renderToTasksMd,
  renderToPlanSteps,
  parseFromGitHubIssue,
} from '../src/github/unified_checklist.js';
import { saveGoal, createEmptyGoal, type ActiveGoal } from '../src/hooks/goal_injector.js';
import {
  pushGoal,
  saveGoalStack,
  createEmptyStack,
  type GoalLevel,
} from '../src/session/goal_stack.js';

let tempDir: string;
let origClaudeDir: string | undefined;
let origSessionId: string | undefined;
const TEST_SESSION_ID = 'test-session-goal-unified';

function setTestGoal(): void {
  // Use session-scoped goal instead of global
  const goal: GoalLevel = {
    id: 'test-goal',
    type: 'task',
    summary: 'Build metrics dashboard',
    fields: {
      who: 'engineering team',
      what: 'real-time metrics dashboard',
      when: 'Q1 2026',
      where: 'internal portal',
      why: 'visibility into system health',
      how: 'React + WebSocket',
    },
    source: { manual: true },
    pushedAt: new Date().toISOString(),
    pushedBy: 'Manual',
  };
  saveGoalStack(createEmptyStack(TEST_SESSION_ID));
  pushGoal(TEST_SESSION_ID, goal);
}

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  origSessionId = process.env['CLAUDE_SESSION_ID'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goal-sync-test-'));
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
  fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  setTestGoal();
});

describe('createItem goal auto-population', () => {
  it('auto-populates goal_context from active-goal.json', () => {
    const item = createItem({ title: 'Add chart component' });
    expect(item.goal_context).not.toBeNull();
    expect(item.goal_context!.summary).toBe('Build metrics dashboard');
    expect(item.goal_context!.fields.who).toBe('engineering team');
  });

  it('respects explicit goal_context override', () => {
    const item = createItem({
      title: 'Unrelated task',
      goal_context: { summary: 'Other goal', fields: {} },
    });
    expect(item.goal_context!.summary).toBe('Other goal');
  });

  it('respects explicit null goal_context', () => {
    const item = createItem({ title: 'No goal task', goal_context: null });
    expect(item.goal_context).toBeNull();
  });
});

describe('renderToGitHubBody with goal', () => {
  it('includes ## Goal section', () => {
    const item = createItem({ title: 'Add chart component' });
    const body = renderToGitHubBody(item);
    expect(body).toContain('## Goal');
    expect(body).toContain('Build metrics dashboard');
    expect(body).toContain('- WHO: engineering team');
  });

  it('omits goal section when no goal', () => {
    const item = createItem({ title: 'No goal', goal_context: null });
    const body = renderToGitHubBody(item);
    expect(body).not.toContain('## Goal');
  });
});

describe('renderToTaskCreate with goal', () => {
  it('includes Goal: line in description', () => {
    const item = createItem({ title: 'Add chart' });
    const result = renderToTaskCreate(item);
    expect(result.description).toContain('Goal: Build metrics dashboard');
  });

  it('omits Goal: line when no goal', () => {
    const item = createItem({ title: 'No goal', goal_context: null });
    const result = renderToTaskCreate(item);
    expect(result.description).not.toContain('Goal:');
  });
});

describe('renderToTasksMd with goal', () => {
  it('includes goal header', () => {
    const items = [createItem({ title: 'Task A' }), createItem({ title: 'Task B' })];
    const md = renderToTasksMd(items);
    expect(md).toContain('## Goal: Build metrics dashboard');
    expect(md).toContain('- [ ] Task A');
  });

  it('omits header when no goal', () => {
    const items = [createItem({ title: 'Task A', goal_context: null })];
    const md = renderToTasksMd(items);
    expect(md).not.toContain('## Goal');
  });
});

describe('renderToPlanSteps with goal', () => {
  it('includes goal header', () => {
    const items = [createItem({ title: 'Step one' }), createItem({ title: 'Step two' })];
    const plan = renderToPlanSteps(items);
    expect(plan).toContain('Goal: Build metrics dashboard');
    expect(plan).toContain('1. Step one');
  });
});

describe('parseFromGitHubIssue round-trip', () => {
  it('parses goal section back into goal_context', () => {
    const item = createItem({
      title: 'Test issue',
      sources: { github_issue: 42, claude_task: null, openspec_change: null, plan_step: null },
    });
    const body = renderToGitHubBody(item);

    const parsed = parseFromGitHubIssue({
      number: 42,
      title: 'Test issue',
      body,
      state: 'OPEN',
      labels: [],
    });

    expect(parsed.goal_context).not.toBeNull();
    expect(parsed.goal_context!.summary).toBe('Build metrics dashboard');
    expect(parsed.goal_context!.fields.who).toBe('engineering team');
  });

  it('returns null goal_context when no goal section', () => {
    const parsed = parseFromGitHubIssue({
      number: 1,
      title: 'Plain issue',
      body: '## Problem\nSomething broke',
      state: 'OPEN',
      labels: [],
    });
    expect(parsed.goal_context).toBeNull();
  });
});
