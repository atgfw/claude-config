import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadGoal,
  saveGoal,
  createEmptyGoal,
  formatGoalContext,
  hasDehydratedFields,
  goalInjectorStop,
  goalInjectorHook,
  goalInjectorSessionStart,
  type ActiveGoal,
} from '../src/hooks/goal_injector.js';
import {
  pushGoal,
  createTaskGoal,
  loadGoalStack,
  saveGoalStack,
  createEmptyStack,
  type GoalLevel,
} from '../src/session/goal_stack.js';

let tempDir: string;
let origClaudeDir: string | undefined;
let origSessionId: string | undefined;
const TEST_SESSION_ID = 'test-session-goal-injector';

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  origSessionId = process.env['CLAUDE_SESSION_ID'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goal-test-'));
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
  // Clear global goal
  saveGoal(createEmptyGoal());
  // Clear session goal stack
  saveGoalStack(createEmptyStack(TEST_SESSION_ID));
});

/**
 * Helper to push a goal to the session stack
 */
function pushTestGoal(summary: string, fields?: Partial<GoalLevel['fields']>): void {
  const goal: GoalLevel = {
    id: `test-${Date.now()}`,
    type: 'task',
    summary,
    fields: {
      who: fields?.who ?? 'test user',
      what: fields?.what ?? summary,
      when: fields?.when ?? 'now',
      where: fields?.where ?? 'test',
      why: fields?.why ?? 'testing',
      how: fields?.how ?? 'vitest',
    },
    source: { manual: true },
    pushedAt: new Date().toISOString(),
    pushedBy: 'Manual',
  };
  pushGoal(TEST_SESSION_ID, goal);
}

describe('loadGoal (legacy global)', () => {
  it('returns empty goal when file has null values', () => {
    const goal = loadGoal();
    expect(goal.goal).toBeNull();
    expect(goal.summary).toBeNull();
    expect(goal.fields.who).toBe('unknown');
  });

  it('returns saved goal data', () => {
    const g = createEmptyGoal();
    g.goal = 'Build the widget';
    g.summary = 'Build the widget';
    g.fields.what = 'a widget';
    saveGoal(g);

    const loaded = loadGoal();
    expect(loaded.goal).toBe('Build the widget');
    expect(loaded.fields.what).toBe('a widget');
  });
});

describe('formatGoalContext (session-scoped)', () => {
  it('returns empty string when no session goal', () => {
    expect(formatGoalContext()).toBe('');
  });

  it('formats session goal hierarchy', () => {
    pushTestGoal('Build dashboard', { what: 'a metrics dashboard' });
    const result = formatGoalContext();
    expect(result).toContain('ACTIVE GOAL HIERARCHY');
    expect(result).toContain('Build dashboard');
  });
});

describe('hasDehydratedFields', () => {
  it('returns true when fields are unknown', () => {
    expect(hasDehydratedFields(createEmptyGoal())).toBe(true);
  });

  it('returns false when all fields populated', () => {
    const g = createEmptyGoal();
    g.fields = {
      who: 'team',
      what: 'thing',
      when: 'now',
      where: 'here',
      why: 'because',
      how: 'code',
    };
    expect(hasDehydratedFields(g)).toBe(false);
  });
});

describe('saveGoal and loadGoal round-trip', () => {
  it('preserves all fields', () => {
    const original: ActiveGoal = {
      goal: 'Test goal',
      fields: {
        who: 'testers',
        what: 'testing',
        when: 'now',
        where: 'here',
        why: 'quality',
        how: 'vitest',
      },
      summary: 'Test goal summary',
      updatedAt: '2026-01-01T00:00:00.000Z',
      history: [{ summary: 'old goal', clearedAt: '2025-12-31T00:00:00.000Z' }],
    };
    saveGoal(original);
    const loaded = loadGoal();
    expect(loaded).toEqual(original);
  });
});

describe('goalInjectorStop (session-scoped)', () => {
  it('returns approve with goal context when session goal is active', async () => {
    pushTestGoal('Build dashboard', { what: 'a metrics dashboard' });

    const result = await goalInjectorStop({ reason: 'session end' });
    expect(result.decision).toBe('approve');
    expect(result.reason).toContain('Session ending with active goal');
    expect(result.reason).toContain('Build dashboard');
  });

  it('returns approve without reason when no session goal', async () => {
    const result = await goalInjectorStop({ reason: 'session end' });
    expect(result.decision).toBe('approve');
    expect(result.reason).toBeUndefined();
  });
});

describe('soft prompt when no goal', () => {
  it('goalInjectorHook returns soft prompt when no session goal set', async () => {
    const result = await goalInjectorHook({ prompt: 'do something' });
    expect(result.additionalContext).toContain('NO ACTIVE GOAL SET');
    expect(result.additionalContext).toContain('Consider defining a goal');
  });

  it('goalInjectorHook returns goal context when session goal is set', async () => {
    pushTestGoal('Test goal');

    const result = await goalInjectorHook({ prompt: 'do something' });
    expect(result.additionalContext).toContain('Test goal');
    expect(result.additionalContext).not.toContain('NO ACTIVE GOAL SET');
  });

  it('goalInjectorSessionStart returns soft prompt when no session goal set', async () => {
    const result = await goalInjectorSessionStart({});
    expect(result.additionalContext).toContain('NO ACTIVE GOAL SET');
  });

  it('goalInjectorSessionStart returns goal context when session goal is set', async () => {
    pushTestGoal('Session goal');

    const result = await goalInjectorSessionStart({});
    expect(result.additionalContext).toContain('Session goal');
    expect(result.additionalContext).not.toContain('NO ACTIVE GOAL SET');
  });
});
