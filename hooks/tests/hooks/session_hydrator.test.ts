import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  sessionHydrator,
  hydrateOpenSpec,
  hydratePlanFile,
} from '../../src/hooks/session_hydrator.js';
import { saveRegistry, type SyncRegistry } from '../../src/github/task_source_sync.js';
import type { ActiveGoal } from '../../src/hooks/goal_injector.js';

let tempDir: string;
let origClaudeDir: string | undefined;
let origSessionId: string | undefined;
const TEST_SESSION_ID = 'test-session-hydrator';

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  origSessionId = process.env['CLAUDE_SESSION_ID'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-hydrator-test-'));
  fs.mkdirSync(path.join(tempDir, 'ledger'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'openspec', 'changes', 'test-change'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'plans'), { recursive: true });
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
  const emptyRegistry: SyncRegistry = { version: 1, entries: [] };
  saveRegistry(emptyRegistry);
  // Clear session goal stack
  const stackPath = path.join(tempDir, 'sessions', TEST_SESSION_ID, 'goal-stack.json');
  if (fs.existsSync(stackPath)) {
    fs.unlinkSync(stackPath);
  }
});

function writeGoal(goal: ActiveGoal): void {
  const goalPath = path.join(tempDir, 'ledger', 'active-goal.json');
  fs.writeFileSync(goalPath, JSON.stringify(goal, null, 2), 'utf-8');
}

describe('sessionHydrator', () => {
  it('bootstraps goal when no linked artifacts', async () => {
    writeGoal({
      goal: 'Test goal',
      fields: { who: '', what: '', when: '', where: '', why: '', how: '' },
      summary: 'Test goal',
      updatedAt: null,
      history: [],
    });

    const result = await sessionHydrator({});
    expect(result.hookEventName).toBe('SessionStart');
    // Goal is bootstrapped even without linked artifacts
    expect(result.additionalContext).toContain('Goal: Test goal');
  });

  it('bootstraps goal when linkedArtifacts is empty', async () => {
    writeGoal({
      goal: 'Test goal',
      fields: { who: '', what: '', when: '', where: '', why: '', how: '' },
      summary: 'Test goal',
      updatedAt: null,
      history: [],
      linkedArtifacts: {},
    });

    const result = await sessionHydrator({});
    expect(result.hookEventName).toBe('SessionStart');
    // Goal is bootstrapped even with empty linked artifacts
    expect(result.additionalContext).toContain('Goal: Test goal');
  });

  it('hydrates openspec tasks on session start', async () => {
    // Create tasks.md file
    const tasksPath = path.join(tempDir, 'openspec', 'changes', 'test-change', 'tasks.md');
    fs.writeFileSync(tasksPath, '- [ ] Task one\n- [x] Task two\n');

    writeGoal({
      goal: 'Test goal',
      fields: { who: '', what: '', when: '', where: '', why: '', how: '' },
      summary: 'Test goal',
      updatedAt: null,
      history: [],
      linkedArtifacts: {
        openspec: 'test-change',
      },
    });

    const result = await sessionHydrator({});
    expect(result.additionalContext).toContain('Hydrated');
    expect(result.additionalContext).toContain('openspec:test-change');
  });

  it('hydrates plan files on session start', async () => {
    // Create plan file
    const planPath = path.join(tempDir, 'plans', 'test-plan.md');
    fs.writeFileSync(planPath, '# Plan\n\n- [ ] Step one\n- [-] Step two\n');

    writeGoal({
      goal: 'Test goal',
      fields: { who: '', what: '', when: '', where: '', why: '', how: '' },
      summary: 'Test goal',
      updatedAt: null,
      history: [],
      linkedArtifacts: {
        plan_files: ['plans/test-plan.md'],
      },
    });

    const result = await sessionHydrator({});
    expect(result.additionalContext).toContain('Hydrated');
    expect(result.additionalContext).toContain('plan:test-plan.md');
  });

  it('reports failed hydrations', async () => {
    writeGoal({
      goal: 'Test goal',
      fields: { who: '', what: '', when: '', where: '', why: '', how: '' },
      summary: 'Test goal',
      updatedAt: null,
      history: [],
      linkedArtifacts: {
        openspec: 'nonexistent-change',
      },
    });

    const result = await sessionHydrator({});
    expect(result.additionalContext).toContain('Failed to hydrate');
    expect(result.additionalContext).toContain('openspec:nonexistent-change');
  });
});

describe('hydrateOpenSpec', () => {
  it('returns true for existing tasks.md', async () => {
    const tasksPath = path.join(tempDir, 'openspec', 'changes', 'test-change', 'tasks.md');
    fs.writeFileSync(tasksPath, '- [ ] Task\n');

    const result = await hydrateOpenSpec('test-change');
    expect(result).toBe(true);
  });

  it('returns false for nonexistent change', async () => {
    const result = await hydrateOpenSpec('does-not-exist');
    expect(result).toBe(false);
  });
});

describe('hydratePlanFile', () => {
  it('returns true for existing plan file', async () => {
    const planPath = path.join(tempDir, 'plans', 'existing-plan.md');
    fs.writeFileSync(planPath, '- [ ] Step\n');

    const result = await hydratePlanFile('plans/existing-plan.md');
    expect(result).toBe(true);
  });

  it('returns false for nonexistent plan', async () => {
    const result = await hydratePlanFile('plans/nonexistent.md');
    expect(result).toBe(false);
  });

  it('handles absolute paths', async () => {
    const planPath = path.join(tempDir, 'plans', 'absolute-plan.md');
    fs.writeFileSync(planPath, '- [ ] Step\n');

    const result = await hydratePlanFile(planPath);
    expect(result).toBe(true);
  });
});
