/**
 * Tests for Goal Auto-Derivation Hook
 *
 * Verifies automatic goal derivation from work context sources.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  parseGitBranch,
  deriveGoalFromContext,
  hydrateGoalStack,
  type DerivedGoal,
  type GitBranchInfo,
} from '../src/hooks/goal_auto_derivation.js';
import { loadGoalStack, saveGoalStack, createEmptyStack } from '../src/session/goal_stack.js';
import { getClaudeDir } from '../src/utils.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs for controlled testing - use simple mocks without importActual
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
}));

describe('parseGitBranch', () => {
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when git command fails', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });

    const result = parseGitBranch('/some/path');
    expect(result).toBeNull();
  });

  it('returns branch without issue for main branch', () => {
    mockExecSync.mockReturnValue('main\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({ branch: 'main' });
  });

  it('extracts issue number from feature/issue-123 pattern', () => {
    mockExecSync.mockReturnValue('feature/issue-123\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({
      branch: 'feature/issue-123',
      issueNumber: 123,
      issueType: 'feature',
    });
  });

  it('extracts issue number from bugfix/456-description pattern', () => {
    mockExecSync.mockReturnValue('bugfix/456-fix-login-bug\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({
      branch: 'bugfix/456-fix-login-bug',
      issueNumber: 456,
      issueType: 'bugfix',
    });
  });

  it('extracts issue number from standalone 789-description pattern', () => {
    mockExecSync.mockReturnValue('789-add-new-feature\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({
      branch: '789-add-new-feature',
      issueNumber: 789,
      issueType: 'feature', // defaults to feature
    });
  });

  it('extracts issue number from hotfix branch', () => {
    mockExecSync.mockReturnValue('hotfix/issue-999\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({
      branch: 'hotfix/issue-999',
      issueNumber: 999,
      issueType: 'hotfix',
    });
  });

  it('returns branch only when no issue pattern matches', () => {
    mockExecSync.mockReturnValue('some-random-branch\n');

    const result = parseGitBranch('/some/path');
    expect(result).toEqual({ branch: 'some-random-branch' });
  });
});

describe('deriveGoalFromContext', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives goal from git branch with GitHub issue', () => {
    // Mock git branch
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'feature/issue-42\n';
      }
      if (cmd.includes('gh issue view')) {
        return JSON.stringify({
          title: 'Add authentication',
          body: '**WHO:** Users\n**WHAT:** Implement OAuth login',
          labels: [{ name: 'enhancement' }],
        });
      }
      return '';
    });

    // Mock active-goal.json to not exist
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('git-branch');
    expect(result.confidence).toBe('high');
    expect(result.goal).not.toBeNull();
    expect(result.goal?.summary).toBe('Add authentication');
    expect(result.goal?.source.github_issue).toBe(42);
  });

  it('derives goal from OpenSpec linked artifact', () => {
    // Mock git branch (main - no issue)
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

    // Mock active-goal.json with linked OpenSpec
    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: null,
          summary: null,
          fields: {},
          linkedArtifacts: {
            openspec: 'add-new-feature',
          },
        });
      }
      if (pathStr.includes('proposal.md')) {
        return '# Add New Feature\n\nThis proposal adds a new feature.\n\n**WHO:** Developers';
      }
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('openspec');
    expect(result.confidence).toBe('high');
    expect(result.goal).not.toBeNull();
    expect(result.goal?.summary).toBe('Add New Feature');
  });

  it('falls back to active-goal.json when no other context', () => {
    // Mock git branch (main - no issue)
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      if (cmd.includes('git log')) {
        return 'chore(sync): session state sync\n';
      }
      throw new Error('command failed');
    });

    // Mock active-goal.json with direct goal
    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: 'Build the thing',
          summary: 'Build the thing',
          fields: {
            who: 'Team',
            what: 'Build the thing',
            when: 'Now',
            where: 'Here',
            why: 'Because',
            how: 'With code',
            which: 'This project',
            lest: 'Failure',
            with: 'TypeScript',
            measuredBy: 'Tests pass',
          },
        });
      }
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('active-goal');
    expect(result.confidence).toBe('medium');
    expect(result.goal?.summary).toBe('Build the thing');
  });

  it('returns none when no context available', () => {
    // Mock git branch (main - no issue)
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      if (cmd.includes('git log')) {
        return 'chore(sync): session state sync\n';
      }
      throw new Error('command failed');
    });

    // Mock no active-goal.json
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('none');
    expect(result.goal).toBeNull();
  });
});

describe('hydrateGoalStack', () => {
  const testSessionId = 'test-session-hydrate';
  const testWorkingDir = '/test/project';
  const mockWriteFileSync = vi.mocked(fs.writeFileSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);
  const mockMkdirSync = vi.mocked(fs.mkdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock empty stack by default
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    mockWriteFileSync.mockImplementation(() => undefined);
    mockMkdirSync.mockImplementation(() => undefined);
  });

  it('hydrates empty stack with derived goal', () => {
    const derived: DerivedGoal = {
      source: 'git-branch',
      goal: {
        id: 'issue-42',
        type: 'issue',
        summary: 'Test issue',
        fields: {
          who: 'Test',
          what: 'Test',
          when: 'Now',
          where: 'Here',
          why: 'Testing',
          how: 'With tests',
          which: 'This',
          lest: 'Failure',
          with: 'Vitest',
          measuredBy: 'Pass',
        },
        source: { github_issue: 42 },
        pushedAt: new Date().toISOString(),
        pushedBy: 'SessionStart',
      },
      confidence: 'high',
      reason: 'From git branch',
    };

    const result = hydrateGoalStack(testSessionId, testWorkingDir, derived);

    expect(result.hydrated).toBe(true);
    expect(result.message).toContain('Auto-derived goal');
    expect(result.message).toContain('Test issue');
  });

  it('does not override existing goals', () => {
    // Mock existing stack with goal
    mockReadFileSync.mockImplementation(() => {
      return JSON.stringify({
        session_id: testSessionId,
        working_directory: testWorkingDir,
        stack: [
          {
            id: 'existing-goal',
            type: 'task',
            summary: 'Existing work',
            fields: {},
            source: {},
            pushedAt: new Date().toISOString(),
            pushedBy: 'Manual',
          },
        ],
        history: [],
        lastModified: new Date().toISOString(),
      });
    });

    const derived: DerivedGoal = {
      source: 'git-branch',
      goal: {
        id: 'new-goal',
        type: 'issue',
        summary: 'New goal',
        fields: {
          who: 'Test',
          what: 'Test',
          when: 'Now',
          where: 'Here',
          why: 'Testing',
          how: 'With tests',
          which: 'This',
          lest: 'Failure',
          with: 'Vitest',
          measuredBy: 'Pass',
        },
        source: { github_issue: 99 },
        pushedAt: new Date().toISOString(),
        pushedBy: 'SessionStart',
      },
      confidence: 'high',
      reason: 'From git branch',
    };

    const result = hydrateGoalStack(testSessionId, testWorkingDir, derived);

    expect(result.hydrated).toBe(false);
    expect(result.message).toContain('Existing goal in focus');
  });

  it('returns not hydrated when no goal derived', () => {
    const derived: DerivedGoal = {
      source: 'none',
      goal: null,
      confidence: 'low',
      reason: 'No context found',
    };

    const result = hydrateGoalStack(testSessionId, testWorkingDir, derived);

    expect(result.hydrated).toBe(false);
    expect(result.message).toBe('No context found');
  });
});

describe('priority cascade', () => {
  const mockExecSync = vi.mocked(execSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('git branch takes priority over active-goal.json', () => {
    // Mock git branch with issue
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'feature/issue-1\n';
      }
      if (cmd.includes('gh issue view')) {
        return JSON.stringify({
          title: 'Git Branch Issue',
          body: '',
          labels: [],
        });
      }
      return '';
    });

    // Mock active-goal.json with different goal
    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: 'Different Goal',
          summary: 'Different Goal',
          fields: {},
        });
      }
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('git-branch');
    expect(result.goal?.summary).toBe('Git Branch Issue');
  });

  it('OpenSpec takes priority over plain active-goal.json', () => {
    // Mock git branch (main - no issue)
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

    // Mock active-goal.json with OpenSpec link AND direct goal
    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: 'Direct Goal',
          summary: 'Direct Goal',
          fields: {},
          linkedArtifacts: {
            openspec: 'priority-test',
          },
        });
      }
      if (pathStr.includes('proposal.md')) {
        return '# OpenSpec Priority\n\nThis should win.';
      }
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('openspec');
    expect(result.goal?.summary).toBe('OpenSpec Priority');
  });
});
