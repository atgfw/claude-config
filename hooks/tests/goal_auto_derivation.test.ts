/**
 * Tests for Goal Auto-Derivation Hook (LLM-Native)
 *
 * Tests the context detection and LLM prompt generation.
 * Note: This hook DETECTS context and PROMPTS Claude - it does NOT parse text.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseGitBranch,
  deriveGoalFromContext,
  hydrateGoalStack,
  needsExtraction,
  generateIssueExtractionPrompt,
  generateOpenSpecExtractionPrompt,
  type DerivedGoal,
} from '../src/hooks/goal_auto_derivation.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs for controlled testing
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

// Cast mocks for type safety
const mockExecSync = execSync as Mock;
const mockReadFileSync = fs.readFileSync as Mock;
const mockWriteFileSync = fs.writeFileSync as Mock;
const mockMkdirSync = fs.mkdirSync as Mock;

describe('parseGitBranch', () => {
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
      issueType: 'feature',
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives goal from git branch with GitHub issue', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'feature/issue-42\n';
      }
      if (cmd.includes('gh issue view')) {
        return JSON.stringify({ title: 'Add authentication' });
      }
      return '';
    });

    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('git-branch');
    expect(result.confidence).toBe('high');
    expect(result.goal).not.toBeNull();
    expect(result.goal?.summary).toBe('Add authentication');
    expect(result.goal?.source.github_issue).toBe(42);
    // LLM-native: should always need extraction for GitHub issues
    expect(result.needsExtraction).toBe(true);
    expect(result.issueNumber).toBe(42);
  });

  it('derives goal from OpenSpec linked artifact', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: null,
          summary: null,
          fields: {},
          linkedArtifacts: { openspec: 'add-new-feature' },
        });
      }
      if (pathStr.includes('proposal.md')) {
        return '# Add New Feature\n\nThis proposal adds a new feature.';
      }
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('openspec');
    expect(result.confidence).toBe('high');
    expect(result.goal).not.toBeNull();
    expect(result.goal?.summary).toBe('Add New Feature');
    expect(result.needsExtraction).toBe(true);
  });

  it('falls back to active-goal.json when no other context', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

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
            lest: 'Must not fail',
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
    // Fields are populated, so no extraction needed
    expect(result.needsExtraction).toBe(false);
  });

  it('returns none when no context available', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = deriveGoalFromContext('/test/project');

    expect(result.source).toBe('none');
    expect(result.goal).toBeNull();
    expect(result.needsExtraction).toBe(false);
  });
});

describe('hydrateGoalStack', () => {
  const testSessionId = 'test-session-hydrate';
  const testWorkingDir = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
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
      needsExtraction: true,
      issueNumber: 42,
    };

    const result = hydrateGoalStack(testSessionId, testWorkingDir, derived);

    expect(result.hydrated).toBe(true);
    expect(result.message).toContain('Auto-derived goal');
    expect(result.message).toContain('Test issue');
  });

  it('does not override existing goals', () => {
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
      needsExtraction: true,
      issueNumber: 99,
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
      needsExtraction: false,
    };

    const result = hydrateGoalStack(testSessionId, testWorkingDir, derived);

    expect(result.hydrated).toBe(false);
    expect(result.message).toBe('No context found');
  });
});

describe('needsExtraction', () => {
  it('returns true when fields have placeholders', () => {
    const fields = {
      who: 'unknown',
      what: 'Test',
      when: 'Current task',
      where: 'Target not specified',
      why: 'Task in progress',
      how: 'Following implementation plan',
      which: 'Target object not specified',
      lest: 'Failure modes not defined',
      with: 'Dependencies not enumerated',
      measuredBy: 'Success metrics not defined',
    };

    expect(needsExtraction(fields)).toBe(true);
  });

  it('returns false when fields are populated', () => {
    const fields = {
      who: 'Development team',
      what: 'Implement authentication',
      when: 'Sprint 5',
      where: 'src/auth/',
      why: 'Users need secure login',
      how: 'Using OAuth2 flow',
      which: 'AuthService.ts, LoginForm.tsx',
      lest: 'Must not expose credentials',
      with: 'TypeScript, React, OAuth2',
      measuredBy: 'All auth tests passing',
    };

    expect(needsExtraction(fields)).toBe(false);
  });

  it('returns true when markdown headers are in fields (parsing garbage)', () => {
    const fields = {
      who: 'Claude Code session',
      what: '## Problem',
      when: 'Current task',
      where: '/some/path',
      why: '# Goal',
      how: 'Following implementation plan',
      which: 'Target not specified',
      lest: 'Failure modes not defined',
      with: 'Dependencies not enumerated',
      measuredBy: 'Success metrics not defined',
    };

    expect(needsExtraction(fields)).toBe(true);
  });
});

describe('LLM extraction prompts', () => {
  it('generateIssueExtractionPrompt creates valid prompt', () => {
    const prompt = generateIssueExtractionPrompt(42, 'Add authentication');

    expect(prompt).toContain('Issue #42');
    expect(prompt).toContain('Add authentication');
    expect(prompt).toContain('gh issue view 42');
    expect(prompt).toContain('WHO:');
    expect(prompt).toContain('WHAT:');
    expect(prompt).toContain('WHY:');
    expect(prompt).toContain('active-goal.json');
  });

  it('generateOpenSpecExtractionPrompt creates valid prompt', () => {
    const prompt = generateOpenSpecExtractionPrompt('add-new-feature', 'Add New Feature');

    expect(prompt).toContain('OpenSpec: add-new-feature');
    expect(prompt).toContain('Add New Feature');
    expect(prompt).toContain('proposal.md');
    expect(prompt).toContain('WHO:');
    expect(prompt).toContain('WHAT:');
  });
});

describe('priority cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('git branch takes priority over active-goal.json', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'feature/issue-1\n';
      }
      if (cmd.includes('gh issue view')) {
        return JSON.stringify({ title: 'Git Branch Issue' });
      }
      return '';
    });

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
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('branch --show-current')) {
        return 'main\n';
      }
      throw new Error('command failed');
    });

    mockReadFileSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('active-goal.json')) {
        return JSON.stringify({
          goal: 'Direct Goal',
          summary: 'Direct Goal',
          fields: {},
          linkedArtifacts: { openspec: 'priority-test' },
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
