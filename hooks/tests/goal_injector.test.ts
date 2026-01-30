import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadGoal,
  saveGoal,
  createEmptyGoal,
  detectGoalSet,
  detectGoalClear,
  extractGoalText,
  formatGoalContext,
  hasDehydratedFields,
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

describe('detectGoalSet', () => {
  it('detects "the goal is"', () => {
    expect(detectGoalSet('the goal is to build a dashboard')).toBe(true);
  });

  it('detects "we\'re working on"', () => {
    expect(detectGoalSet("we're working on the API integration")).toBe(true);
  });

  it('detects "the task is"', () => {
    expect(detectGoalSet('the task is refactoring auth')).toBe(true);
  });

  it('detects "set goal:"', () => {
    expect(detectGoalSet('set goal: deploy v2')).toBe(true);
  });

  it('does not match random text', () => {
    expect(detectGoalSet('please fix the bug')).toBe(false);
  });
});

describe('detectGoalClear', () => {
  it('detects "done"', () => {
    expect(detectGoalClear("we're done")).toBe(true);
  });

  it('detects "finished"', () => {
    expect(detectGoalClear('finished with that')).toBe(true);
  });

  it('detects "new task"', () => {
    expect(detectGoalClear('new task please')).toBe(true);
  });

  it('detects "clear goal"', () => {
    expect(detectGoalClear('clear goal')).toBe(true);
  });

  it('does not match random text', () => {
    expect(detectGoalClear('continue working')).toBe(false);
  });
});

describe('extractGoalText', () => {
  it('extracts text after "the goal is"', () => {
    expect(extractGoalText('the goal is to build a dashboard')).toBe('to build a dashboard');
  });

  it('extracts up to sentence boundary', () => {
    expect(extractGoalText('the goal is fix the login bug. Then deploy.')).toBe(
      'fix the login bug'
    );
  });

  it('falls back to full prompt if no pattern', () => {
    expect(extractGoalText('build a widget')).toBe('build a widget');
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
