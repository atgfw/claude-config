import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import {
  createItem,
  renderToGitHubBody,
  renderToTaskCreate,
  renderToTasksMd,
  renderToPlanSteps,
  parseFromGitHubIssue,
} from '../src/github/unified_checklist.js';
import {
  saveGoal,
  createEmptyGoal,
  getGoalPath,
  type ActiveGoal,
} from '../src/hooks/goal_injector.js';

let backup: string | null = null;

function setTestGoal(): void {
  const goal: ActiveGoal = {
    goal: 'Build metrics dashboard',
    fields: {
      who: 'engineering team',
      what: 'real-time metrics dashboard',
      when: 'Q1 2026',
      where: 'internal portal',
      why: 'visibility into system health',
      how: 'React + WebSocket',
    },
    summary: 'Build metrics dashboard',
    updatedAt: new Date().toISOString(),
    history: [],
  };
  saveGoal(goal);
}

beforeEach(() => {
  const goalPath = getGoalPath();
  try {
    backup = fs.readFileSync(goalPath, 'utf-8');
  } catch {
    backup = null;
  }
  setTestGoal();
});

afterEach(() => {
  const goalPath = getGoalPath();
  if (backup !== null) {
    fs.writeFileSync(goalPath, backup, 'utf-8');
  } else {
    saveGoal(createEmptyGoal());
  }
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
