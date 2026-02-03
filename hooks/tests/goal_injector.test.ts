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
  type ActiveGoal,
} from '../src/hooks/goal_injector.js';

let tempDir: string;
let origClaudeDir: string | undefined;

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goal-test-'));
  fs.mkdirSync(path.join(tempDir, 'ledger'), { recursive: true });
  process.env['CLAUDE_DIR'] = tempDir;
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
  saveGoal(createEmptyGoal());
});

describe('loadGoal', () => {
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

describe('formatGoalContext', () => {
  it('returns empty string for no goal', () => {
    expect(formatGoalContext(createEmptyGoal())).toBe('');
  });

  it('formats active goal with fields', () => {
    const g = createEmptyGoal();
    g.goal = 'Build dashboard';
    g.summary = 'Build dashboard';
    g.fields.what = 'a metrics dashboard';
    const result = formatGoalContext(g);
    expect(result).toContain('ACTIVE GOAL: Build dashboard');
    expect(result).toContain('WHAT: a metrics dashboard');
    expect(result).toContain('WHO: UNKNOWN - rehydrate');
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

describe('goalInjectorStop', () => {
  it('returns approve with goal context when goal is active', async () => {
    const g = createEmptyGoal();
    g.goal = 'Build dashboard';
    g.summary = 'Build dashboard';
    g.fields.what = 'a metrics dashboard';
    saveGoal(g);

    const result = await goalInjectorStop({ reason: 'session end' });
    expect(result.decision).toBe('approve');
    expect(result.reason).toContain('Session ending with active goal');
    expect(result.reason).toContain('Build dashboard');
  });

  it('returns approve without reason when no goal', async () => {
    saveGoal(createEmptyGoal());
    const result = await goalInjectorStop({ reason: 'session end' });
    expect(result.decision).toBe('approve');
    expect(result.reason).toBeUndefined();
  });
});
