import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  artifactGoalInjector,
  formatGoalSection,
  hasGoalSection,
  OPENSPEC_PATTERN,
  PLAN_PATTERN,
} from '../../src/hooks/artifact_goal_injector.js';
import { saveGoal, createEmptyGoal, type ActiveGoal } from '../../src/hooks/goal_injector.js';

let tempDir: string;
let origClaudeDir: string | undefined;

function setTestGoal(): void {
  const goal: ActiveGoal = {
    goal: 'Build unified checklist system',
    fields: {
      who: 'Claude Code sessions',
      what: 'unified checklist reconciliation',
      when: 'Q1 2026',
      where: 'hooks infrastructure',
      why: 'maintain traceability',
      how: 'shared formatGoalContext',
    },
    summary: 'Build unified checklist system',
    updatedAt: new Date().toISOString(),
    history: [],
  };
  saveGoal(goal);
}

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-goal-test-'));
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

describe('OPENSPEC_PATTERN', () => {
  it('matches proposal.md in openspec changes', () => {
    expect(OPENSPEC_PATTERN.test('/home/user/.claude/openspec/changes/my-change/proposal.md')).toBe(
      true
    );
    expect(
      OPENSPEC_PATTERN.test('C:\\Users\\test\\.claude\\openspec\\changes\\test\\proposal.md')
    ).toBe(true);
  });

  it('matches design.md and tasks.md', () => {
    expect(OPENSPEC_PATTERN.test('/openspec/changes/foo/design.md')).toBe(true);
    expect(OPENSPEC_PATTERN.test('/openspec/changes/foo/tasks.md')).toBe(true);
  });

  it('does not match other files', () => {
    expect(OPENSPEC_PATTERN.test('/openspec/changes/foo/spec.md')).toBe(false);
    expect(OPENSPEC_PATTERN.test('/openspec/project.md')).toBe(false);
    expect(OPENSPEC_PATTERN.test('/some/other/proposal.md')).toBe(false);
  });
});

describe('PLAN_PATTERN', () => {
  it('matches plan files', () => {
    expect(PLAN_PATTERN.test('/home/user/.claude/plans/my-plan.md')).toBe(true);
    expect(PLAN_PATTERN.test('C:\\Users\\test\\.claude\\plan\\task.md')).toBe(true);
  });

  it('does not match other files', () => {
    expect(PLAN_PATTERN.test('/some/other/file.md')).toBe(false);
    expect(PLAN_PATTERN.test('/plans/nested/deep/file.md')).toBe(false);
  });
});

describe('hasGoalSection', () => {
  it('returns true when ## Goal section exists', () => {
    expect(hasGoalSection('# Title\n\n## Goal\n\nSome goal')).toBe(true);
    expect(hasGoalSection('## Goal\nContent')).toBe(true);
  });

  it('returns false when no goal section', () => {
    expect(hasGoalSection('# Title\n\n## Why\n\nContent')).toBe(false);
    expect(hasGoalSection('Some content without headers')).toBe(false);
  });
});

describe('formatGoalSection', () => {
  it('formats goal with all fields', () => {
    const section = formatGoalSection({
      summary: 'Build the system',
      fields: {
        who: 'engineers',
        what: 'new feature',
        when: 'Q1',
        where: 'codebase',
        why: 'improvement',
        how: 'coding',
      },
    });
    expect(section).toContain('## Goal');
    expect(section).toContain('Build the system');
    expect(section).toContain('**WHO:** engineers');
    expect(section).toContain('**WHAT:** new feature');
  });

  it('omits unknown fields', () => {
    const section = formatGoalSection({
      summary: 'Test goal',
      fields: {
        who: 'unknown',
        what: 'something',
      },
    });
    expect(section).not.toContain('**WHO:**');
    expect(section).toContain('**WHAT:** something');
  });
});

describe('artifactGoalInjector', () => {
  it('ignores non-Write tools', async () => {
    const result = await artifactGoalInjector({
      tool_name: 'Read',
      tool_input: { file_path: '/openspec/changes/test/proposal.md' },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('ignores non-artifact files', async () => {
    const result = await artifactGoalInjector({
      tool_name: 'Write',
      tool_input: {
        file_path: '/some/other/file.md',
        content: '# Test\n\nContent',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('returns no context when file has goal section', async () => {
    setTestGoal();
    const result = await artifactGoalInjector({
      tool_name: 'Write',
      tool_input: {
        file_path: '/openspec/changes/test/proposal.md',
        content: '# Title\n\n## Goal\n\nExisting goal',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('warns when no goal set and writing artifact', async () => {
    const result = await artifactGoalInjector({
      tool_name: 'Write',
      tool_input: {
        file_path: '/openspec/changes/test/proposal.md',
        content: '# Title\n\n## Why\n\nContent',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toContain('WARNING');
    expect(result.hookSpecificOutput.additionalContext).toContain('no active goal');
  });

  it('provides goal section when goal set but missing in file', async () => {
    setTestGoal();
    const result = await artifactGoalInjector({
      tool_name: 'Write',
      tool_input: {
        file_path: '/openspec/changes/test/proposal.md',
        content: '# Title\n\n## Why\n\nContent',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toContain('NOTE');
    expect(result.hookSpecificOutput.additionalContext).toContain('## Goal');
    expect(result.hookSpecificOutput.additionalContext).toContain('Build unified checklist system');
  });

  it('works for plan files too', async () => {
    setTestGoal();
    const result = await artifactGoalInjector({
      tool_name: 'Write',
      tool_input: {
        file_path: '/home/user/.claude/plans/my-plan.md',
        content: '# My Plan\n\n1. Step one',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toContain('plan file');
    expect(result.hookSpecificOutput.additionalContext).toContain('## Goal');
  });
});
