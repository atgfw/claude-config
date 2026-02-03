import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

vi.mock('../../src/utils.js', () => ({
  logTerse: vi.fn(),
  logWarn: vi.fn(),
  getClaudeDir: () => '/mock/.claude',
}));

vi.mock('../../src/github/label_taxonomy.js', () => ({
  getLabelsForTitle: vi.fn(() => ['type/fix']),
  getLabelsForSource: vi.fn(() => ['source/test']),
}));

const { execSync } = childProcess as { execSync: ReturnType<typeof vi.fn> };
const { readFileSync } = fs as unknown as { readFileSync: ReturnType<typeof vi.fn> };

// Must import after mocks
const {
  createIssue,
  closeIssue,
  createFromCorrection,
  createFromEscalation,
  createFromOpenSpec,
  computeKeywordOverlap,
} = await import('../../src/github/issue_crud.js');

describe('computeKeywordOverlap', () => {
  it('returns 1 for identical strings', () => {
    expect(computeKeywordOverlap('fix broken hook', 'fix broken hook')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(computeKeywordOverlap('alpha beta gamma', 'delta epsilon zeta')).toBe(0);
  });

  it('returns partial overlap', () => {
    const result = computeKeywordOverlap('fix broken webhook handler', 'fix webhook error');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('filters stopwords', () => {
    // "the" and "a" are stopwords; only "cat" and "dog" remain
    const result = computeKeywordOverlap('the cat', 'a dog');
    expect(result).toBe(0);
  });

  it('returns 1 for two empty strings', () => {
    expect(computeKeywordOverlap('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(computeKeywordOverlap('something', '')).toBe(0);
  });
});

describe('createIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates issue when no duplicates found', () => {
    execSync
      .mockReturnValueOnce('[]') // search returns empty
      .mockReturnValueOnce('https://github.com/owner/repo/issues/42'); // create

    const result = createIssue({ title: 'fix: broken hook', body: 'Details here' });
    expect(result).toBe(42);
  });

  it('returns null when duplicate detected', () => {
    execSync.mockReturnValueOnce(JSON.stringify([{ number: 10, title: 'fix: broken hook' }]));

    const result = createIssue({ title: 'fix: broken hook', body: 'Details' });
    expect(result).toBeNull();
  });

  it('returns null when gh create fails', () => {
    execSync
      .mockReturnValueOnce('[]') // search ok
      .mockImplementationOnce(() => {
        throw new Error('gh failed');
      });

    const result = createIssue({ title: 'fix: something', body: 'body' });
    expect(result).toBeNull();
  });

  it('proceeds with creation when search fails', () => {
    execSync
      .mockImplementationOnce(() => {
        throw new Error('search failed');
      })
      .mockReturnValueOnce('https://github.com/owner/repo/issues/7');

    const result = createIssue({ title: 'fix: thing', body: 'body' });
    expect(result).toBe(7);
  });
});

describe('closeIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true on success', () => {
    execSync.mockReturnValueOnce('');
    expect(closeIssue(42)).toBe(true);
  });

  it('returns false on failure', () => {
    execSync.mockImplementationOnce(() => {
      throw new Error('not found');
    });
    expect(closeIssue(999)).toBe(false);
  });
});

describe('createFromCorrection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats title with system prefix', () => {
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/5');

    createFromCorrection({ description: 'missing validation', system: 'governance' });

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('[governance] fix: missing validation');
  });

  it('defaults system to hooks', () => {
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/6');

    createFromCorrection({ description: 'broken test' });

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('[hooks] fix: broken test');
  });
});

describe('createFromEscalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips low severity', () => {
    const result = createFromEscalation({
      description: 'minor issue',
      severity: 'low',
    });
    expect(result).toBeNull();
    expect(execSync).not.toHaveBeenCalled();
  });

  it('skips medium severity', () => {
    const result = createFromEscalation({
      description: 'medium issue',
      severity: 'medium',
    });
    expect(result).toBeNull();
  });

  it('creates for high severity', () => {
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/8');

    const result = createFromEscalation({
      description: 'critical path broken',
      severity: 'high',
    });
    expect(result).toBe(8);
  });

  it('creates for critical severity with p0 label', () => {
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/9');

    createFromEscalation({
      description: 'system down',
      severity: 'critical',
    });

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('priority/p0-critical');
  });
});

describe('createFromOpenSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads proposal.md when no summary provided', () => {
    readFileSync.mockReturnValueOnce('# Proposal\nAdd new gate for webhooks\n');
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/11');

    createFromOpenSpec('add-webhook-gate');

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('Add new gate for webhooks');
  });

  it('uses provided summary over proposal.md', () => {
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/12');

    createFromOpenSpec('change-id', 'Custom summary');

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('Custom summary');
    // Note: readFileSync may be called for active-goal.json (goal injection)
    // but should NOT be called for proposal.md when summary is provided
    const proposalCalls = readFileSync.mock.calls.filter((call) =>
      String(call[0]).includes('proposal.md')
    );
    expect(proposalCalls).toHaveLength(0);
  });

  it('falls back to changeId when proposal.md missing', () => {
    readFileSync.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });
    execSync.mockReturnValueOnce('[]').mockReturnValueOnce('https://github.com/o/r/issues/13');

    createFromOpenSpec('my-change-id');

    const createCall = execSync.mock.calls[1][0] as string;
    expect(createCall).toContain('my-change-id');
  });
});
