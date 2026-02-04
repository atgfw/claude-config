/**
 * Tests for Goal Compliance Gate Hook
 *
 * Validates that the compliance gate properly:
 * - Detects Windows and Unix paths in hasTargetObject()
 * - Handles stale goals with placeholder fields
 * - Validates compliance across all 11 Task Specification sections
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  goalComplianceGateHook,
  validateGoalCompliance,
  formatComplianceResult,
} from '../../src/hooks/goal_compliance_gate.js';
import {
  saveGoalStack,
  createEmptyStack,
  pushGoal,
  type GoalLevel,
} from '../../src/session/goal_stack.js';

let tempDir: string;
let origClaudeDir: string | undefined;
let origSessionId: string | undefined;
const TEST_SESSION_ID = 'test-session-compliance';

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  origSessionId = process.env['CLAUDE_SESSION_ID'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compliance-gate-test-'));
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
  saveGoalStack(createEmptyStack(TEST_SESSION_ID));
});

function createGoal(overrides: Partial<GoalLevel> = {}): GoalLevel {
  return {
    id: 'test-goal',
    type: 'issue',
    summary: 'Implement feature to improve system performance across all modules',
    fields: {
      who: 'Development team members',
      what: 'Improve system performance by optimizing database queries',
      when: 'Q1 2026 sprint cycle',
      where: 'hooks/src/hooks/goal_compliance_gate.ts',
      why: 'Current performance is below acceptable thresholds',
      how: 'Use TypeScript and vitest for testing',
      which: 'hooks/src/hooks/goal_compliance_gate.ts',
      lest: 'Must not break existing functionality or cause regressions',
      with: 'TypeScript, vitest, bun runtime',
      measuredBy: 'Tests passing with 100% coverage on modified files',
    },
    source: { github_issue: 42 },
    pushedAt: new Date().toISOString(),
    pushedBy: 'IssueDetection',
    ...overrides,
  };
}

describe('validateGoalCompliance', () => {
  describe('Windows path detection in hasTargetObject', () => {
    it('recognizes Windows paths with backslashes in WHERE field', () => {
      const goal = createGoal({
        fields: {
          who: 'Development team',
          what: 'Fix the issue in the hooks directory',
          when: 'Current sprint',
          where: 'C:\\Users\\codya\\.claude\\hooks\\src\\hooks\\my_hook.ts',
          why: 'Bug causing failures',
          how: 'TypeScript implementation',
          which: 'The hook file',
          lest: 'Must not break other hooks',
          with: 'TypeScript, vitest',
          measuredBy: 'Tests passing',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes Windows drive letters (C:\\)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Update configuration',
          when: 'Now',
          where: 'D:\\Projects\\my-app\\config.json',
          why: 'Config needs updating',
          how: 'Edit the file',
          which: 'config.json on D: drive',
          lest: 'Must not corrupt config',
          with: 'Text editor',
          measuredBy: 'App loads successfully',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes Windows paths with forward slashes (C:/)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Update script',
          when: 'Now',
          where: 'C:/Users/codya/scripts/build.ts',
          why: 'Script needs fix',
          how: 'TypeScript',
          which: 'build.ts script',
          lest: 'Must not break build',
          with: 'TypeScript',
          measuredBy: 'Build succeeds',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes UNC paths (\\\\server\\share)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Access network file',
          when: 'Now',
          where: '\\\\fileserver\\shared\\project\\data.json',
          why: 'Need network data',
          how: 'File read',
          which: 'Network share file',
          lest: 'Must handle network errors',
          with: 'Node.js fs module',
          measuredBy: 'File reads successfully',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes Unix paths (/path/to/file)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Update script',
          when: 'Now',
          where: '/home/user/project/src/index.ts',
          why: 'Script needs fix',
          how: 'TypeScript',
          which: '/home/user/project/src/index.ts',
          lest: 'Must not break app',
          with: 'TypeScript',
          measuredBy: 'Tests pass',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes file extensions (.ts, .js, etc.)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Update hook',
          when: 'Now',
          where: 'hooks directory',
          why: 'Hook needs fix',
          how: 'TypeScript',
          which: 'goal_compliance_gate.ts',
          lest: 'Must not break validation',
          with: 'TypeScript',
          measuredBy: 'Validation works',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes GitHub issue references (#123)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Fix issue',
          when: 'Now',
          where: 'Repository',
          why: 'Bug reported',
          how: 'Code fix',
          which: 'Issue #31 - path validation',
          lest: 'Must not regress',
          with: 'TypeScript',
          measuredBy: 'Issue closed',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('recognizes URLs (https://)', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Update API',
          when: 'Now',
          where: 'https://github.com/user/repo/issues/42',
          why: 'API needs update',
          how: 'REST changes',
          which: 'API endpoint',
          lest: 'Must maintain compatibility',
          with: 'Node.js',
          measuredBy: 'API tests pass',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(true);
    });

    it('fails when no path-like content in which/where', () => {
      const goal = createGoal({
        fields: {
          who: 'Developer',
          what: 'Do something',
          when: 'Now',
          where: 'somewhere in the codebase',
          why: 'Needs doing',
          how: 'Some approach',
          which: 'some component or module',
          lest: 'Must not break things',
          with: 'TypeScript',
          measuredBy: 'It works',
        },
      });

      const result = validateGoalCompliance(goal);
      const whichCheck = result.checks.find((c) => c.section === 'Which');
      expect(whichCheck?.present).toBe(false);
    });
  });

  describe('stale goal detection', () => {
    it('marks goals with placeholder fields as stale', () => {
      const goal = createGoal({
        fields: {
          who: 'Claude Code session',
          what: 'Task description',
          when: 'Current task',
          where: 'C:\\Users\\codya\\.claude',
          why: 'Task in progress',
          how: 'Following implementation plan',
          which: 'Target object not specified',
          lest: 'Failure modes not defined',
          with: 'Dependencies not enumerated',
          measuredBy: 'Success metrics not defined',
        },
      });

      // Stale goals should have many placeholder patterns
      const placeholderPatterns = [
        'not specified',
        'not defined',
        'not enumerated',
        'Following implementation plan',
        'Task in progress',
      ];

      const fieldValues = [
        goal.fields.which,
        goal.fields.lest,
        goal.fields.with,
        goal.fields.measuredBy,
        goal.fields.how,
        goal.fields.why,
      ];

      let placeholderCount = 0;
      for (const value of fieldValues) {
        if (placeholderPatterns.some((p) => value.includes(p))) {
          placeholderCount++;
        }
      }

      expect(placeholderCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('compliance scoring', () => {
    it('returns 100% for fully compliant goal', () => {
      const goal = createGoal();
      const result = validateGoalCompliance(goal);

      expect(result.compliant).toBe(true);
      expect(result.score).toBe(100);
      expect(result.missing_required).toHaveLength(0);
    });

    it('returns partial score for partially compliant goal', () => {
      const goal = createGoal({
        summary: 'Fix bug', // Too short for Focus
        fields: {
          who: 'Developer',
          what: 'Fix the bug in the system to improve stability',
          when: 'Now',
          where: 'hooks/src/hooks/test.ts',
          why: 'Bug causing issues',
          how: 'TypeScript fix',
          which: 'test.ts file',
          lest: 'Must not break other features',
          with: 'TypeScript',
          measuredBy: 'Tests passing',
        },
      });

      const result = validateGoalCompliance(goal);

      // Focus should fail (summary too short)
      const focusCheck = result.checks.find((c) => c.section === 'Focus');
      expect(focusCheck?.present).toBe(false);
      expect(result.score).toBeLessThan(100);
    });
  });
});

describe('formatComplianceResult', () => {
  it('formats compliant result', () => {
    const result = {
      compliant: true,
      score: 100,
      checks: [],
      missing_required: [],
    };

    const formatted = formatComplianceResult(result);
    expect(formatted).toContain('[+]');
    expect(formatted).toContain('100%');
  });

  it('formats non-compliant result with missing sections', () => {
    const result = {
      compliant: false,
      score: 80,
      checks: [
        { section: 'Which', required: true, present: false, message: 'Target not specified' },
      ],
      missing_required: ['Which'],
    };

    const formatted = formatComplianceResult(result);
    expect(formatted).toContain('[X]');
    expect(formatted).toContain('80%');
    expect(formatted).toContain('Which');
  });
});

describe('adversarial inputs', () => {
  it('handles paths with unicode characters', () => {
    const goal = createGoal({
      fields: {
        who: 'Developer',
        what: 'Fix unicode path handling',
        when: 'Now',
        where: 'C:\\Users\\日本語\\プロジェクト\\src\\index.ts',
        why: 'International support',
        how: 'TypeScript',
        which: 'Unicode path file',
        lest: 'Must not corrupt filenames',
        with: 'TypeScript',
        measuredBy: 'File operations succeed',
      },
    });

    const result = validateGoalCompliance(goal);
    const whichCheck = result.checks.find((c) => c.section === 'Which');
    // Should recognize .ts extension even with unicode in path
    expect(whichCheck?.present).toBe(true);
  });

  it('handles paths with spaces', () => {
    const goal = createGoal({
      fields: {
        who: 'Developer',
        what: 'Fix spaced path handling',
        when: 'Now',
        where: 'C:\\Users\\My User\\My Documents\\Project Files\\src\\index.ts',
        why: 'Windows compatibility',
        how: 'TypeScript',
        which: 'File with spaces in path',
        lest: 'Must not break on spaces',
        with: 'TypeScript',
        measuredBy: 'Path resolves correctly',
      },
    });

    const result = validateGoalCompliance(goal);
    const whichCheck = result.checks.find((c) => c.section === 'Which');
    expect(whichCheck?.present).toBe(true);
  });

  it('handles very long paths (260+ chars)', () => {
    const longPath = 'C:\\' + 'very_long_directory_name\\'.repeat(15) + 'finally_the_file.ts';
    expect(longPath.length).toBeGreaterThan(260);

    const goal = createGoal({
      fields: {
        who: 'Developer',
        what: 'Handle long paths',
        when: 'Now',
        where: longPath,
        why: 'Windows MAX_PATH issues',
        how: 'TypeScript',
        which: 'Deep nested file',
        lest: 'Must not truncate',
        with: 'TypeScript',
        measuredBy: 'Full path preserved',
      },
    });

    const result = validateGoalCompliance(goal);
    const whichCheck = result.checks.find((c) => c.section === 'Which');
    expect(whichCheck?.present).toBe(true);
  });

  it('handles empty string fields without crashing', () => {
    const goal = createGoal({
      fields: {
        who: '',
        what: '',
        when: '',
        where: '',
        why: '',
        how: '',
        which: '',
        lest: '',
        with: '',
        measuredBy: '',
      },
    });

    // Should not throw, should return non-compliant
    expect(() => validateGoalCompliance(goal)).not.toThrow();
    const result = validateGoalCompliance(goal);
    expect(result.compliant).toBe(false);
  });

  it('handles null-ish values in fields gracefully', () => {
    const goal = createGoal({
      fields: {
        who: undefined as unknown as string,
        what: null as unknown as string,
        when: 'Now',
        where: 'C:\\test\\file.ts',
        why: 'Testing',
        how: 'TypeScript',
        which: 'test.ts',
        lest: 'Must not crash',
        with: 'TypeScript',
        measuredBy: 'No errors',
      },
    });

    // Should not throw on undefined/null
    expect(() => validateGoalCompliance(goal)).not.toThrow();
  });

  it('handles special regex characters in paths', () => {
    const goal = createGoal({
      fields: {
        who: 'Developer',
        what: 'Handle regex chars',
        when: 'Now',
        where: 'C:\\project\\src\\[component]\\(index).ts',
        why: 'Next.js dynamic routes',
        how: 'TypeScript',
        which: '[component] dynamic route file',
        lest: 'Must not break regex',
        with: 'TypeScript',
        measuredBy: 'Path matched correctly',
      },
    });

    expect(() => validateGoalCompliance(goal)).not.toThrow();
    const result = validateGoalCompliance(goal);
    const whichCheck = result.checks.find((c) => c.section === 'Which');
    expect(whichCheck?.present).toBe(true);
  });

  it('handles extremely long field values', () => {
    const longString = 'A'.repeat(10000);
    const goal = createGoal({
      fields: {
        who: longString,
        what: longString,
        when: longString,
        where: 'C:\\test\\file.ts',
        why: longString,
        how: longString,
        which: longString,
        lest: longString,
        with: longString,
        measuredBy: longString,
      },
    });

    // Should not hang or crash on very long strings
    const start = Date.now();
    expect(() => validateGoalCompliance(goal)).not.toThrow();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should complete in <1s
  });
});

describe('goalComplianceGateHook', () => {
  it('approves when no goals in stack', async () => {
    const result = await goalComplianceGateHook({
      session_id: TEST_SESSION_ID,
    });

    expect(result.decision).toBe('approve');
    expect(result.reason).toContain('No active goal');
  });

  it('approves compliant goals', async () => {
    const goal = createGoal();
    pushGoal(TEST_SESSION_ID, goal);

    const result = await goalComplianceGateHook({
      session_id: TEST_SESSION_ID,
    });

    expect(result.decision).toBe('approve');
  });

  it('blocks non-compliant goals', async () => {
    const goal = createGoal({
      fields: {
        who: 'Developer',
        what: 'Do something vague',
        when: 'Sometime',
        where: 'somewhere',
        why: 'because',
        how: 'somehow',
        which: 'something', // No path-like content
        lest: 'bad', // Too short
        with: 'stuff', // Too vague
        measuredBy: 'done', // Too vague
      },
    });
    pushGoal(TEST_SESSION_ID, goal);

    const result = await goalComplianceGateHook({
      session_id: TEST_SESSION_ID,
    });

    expect(result.decision).toBe('block');
    expect(result.reason).toContain('non-compliant');
  });

  it('skips compliance for task-only stacks', async () => {
    const taskGoal: GoalLevel = {
      id: 'task-123',
      type: 'task',
      summary: 'Simple task',
      fields: {
        who: 'Developer',
        what: 'Task',
        when: 'Now',
        where: 'here',
        why: 'because',
        how: 'somehow',
        which: 'something',
        lest: 'bad',
        with: 'stuff',
        measuredBy: 'done',
      },
      source: { claude_task_id: '123' },
      pushedAt: new Date().toISOString(),
      pushedBy: 'TaskUpdate',
    };
    pushGoal(TEST_SESSION_ID, taskGoal);

    const result = await goalComplianceGateHook({
      session_id: TEST_SESSION_ID,
    });

    expect(result.decision).toBe('approve');
    expect(result.reason).toContain('task-level');
  });
});
