import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreToolUseInput } from '../../src/types.js';
import {
  TITLE_REGEX,
  REQUIRED_BODY_SECTIONS,
  validateTitle,
  validateBody,
  findDuplicates,
  issueConventionValidatorHook,
} from '../../src/github/issue_conventions.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock runner to avoid side effects
vi.mock('../../src/runner.js', () => ({
  registerHook: vi.fn(),
}));

import { execSync } from 'node:child_process';

const mockedExecSync = vi.mocked(execSync);

describe('issue_conventions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // TITLE_REGEX
  // ==========================================================================

  describe('TITLE_REGEX', () => {
    it('should match valid title with scope', () => {
      expect(TITLE_REGEX.test('[hooks] feat(validator): add issue checking')).toBe(true);
    });

    it('should match valid title without scope', () => {
      expect(TITLE_REGEX.test('[n8n] fix: correct webhook path')).toBe(true);
    });

    it('should reject missing system prefix', () => {
      expect(TITLE_REGEX.test('feat: add something')).toBe(false);
    });

    it('should reject invalid system', () => {
      expect(TITLE_REGEX.test('[unknown] feat: add something')).toBe(false);
    });

    it('should reject invalid type', () => {
      expect(TITLE_REGEX.test('[hooks] build: update deps')).toBe(false);
    });

    it('should reject uppercase description', () => {
      expect(TITLE_REGEX.test('[hooks] feat: Add something')).toBe(false);
    });

    it('should reject trailing period', () => {
      expect(TITLE_REGEX.test('[hooks] feat: add something.')).toBe(false);
    });
  });

  // ==========================================================================
  // validateTitle
  // ==========================================================================

  describe('validateTitle', () => {
    it('should pass valid title', () => {
      const result = validateTitle('[hooks] feat(validator): add issue checking');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass valid title without scope', () => {
      const result = validateTitle('[infra] chore: update dependencies');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on missing system prefix', () => {
      const result = validateTitle('feat: add something');
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Missing system prefix [<system>]');
    });

    it('should warn on invalid system', () => {
      const result = validateTitle('[badSystem] feat: add something');
      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes('Invalid system'))).toBe(true);
    });

    it('should warn on invalid type', () => {
      const result = validateTitle('[hooks] build: update deps');
      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes('Invalid type'))).toBe(true);
    });

    it('should warn on uppercase description', () => {
      const result = validateTitle('[hooks] feat: Add something');
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Description must start lowercase');
    });

    it('should warn on trailing period', () => {
      const result = validateTitle('[hooks] feat: add something.');
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Title must not end with a period');
    });

    it('should warn on title exceeding 72 chars', () => {
      const longTitle = `[hooks] feat: ${'a'.repeat(60)}`;
      const result = validateTitle(longTitle);
      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes('72 chars'))).toBe(true);
    });
  });

  // ==========================================================================
  // validateBody
  // ==========================================================================

  describe('validateBody', () => {
    it('should pass body with all required sections', () => {
      const body = [
        '## Problem',
        'Something is broken.',
        '## Solution',
        'Fix it.',
        '## Acceptance Criteria',
        '- It works.',
        '## Source',
        'User report.',
      ].join('\n');

      const result = validateBody(body);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on missing sections', () => {
      const body = '## Problem\nSomething is broken.\n## Solution\nFix it.';
      const result = validateBody(body);
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.some((w) => w.includes('Acceptance Criteria'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Source'))).toBe(true);
    });

    it('should warn on completely empty body', () => {
      const result = validateBody('');
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(REQUIRED_BODY_SECTIONS.length);
    });
  });

  // ==========================================================================
  // findDuplicates
  // ==========================================================================

  describe('findDuplicates', () => {
    it('should return matching open issues', () => {
      mockedExecSync.mockReturnValue(
        JSON.stringify([
          { number: 42, title: 'add issue checking', state: 'OPEN' },
          { number: 10, title: 'unrelated thing', state: 'OPEN' },
        ])
      );

      const result = findDuplicates('[hooks] feat: add issue checking');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((r) => r.number === 42)).toBe(true);
    });

    it('should filter out closed issues', () => {
      mockedExecSync.mockReturnValue(
        JSON.stringify([{ number: 42, title: 'add issue checking', state: 'CLOSED' }])
      );

      const result = findDuplicates('[hooks] feat: add issue checking');
      expect(result).toHaveLength(0);
    });

    it('should return empty on exec failure', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('gh not found');
      });

      const result = findDuplicates('[hooks] feat: add issue checking');
      expect(result).toHaveLength(0);
    });

    it('should return empty on invalid JSON', () => {
      mockedExecSync.mockReturnValue('not json');

      const result = findDuplicates('[hooks] feat: add issue checking');
      expect(result).toHaveLength(0);
    });

    it('should return empty when no keywords extracted', () => {
      const result = findDuplicates('[hooks] feat: ab');
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // issueConventionValidatorHook
  // ==========================================================================

  describe('issueConventionValidatorHook', () => {
    it('should allow non-Bash tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/test.ts', content: '' },
      };

      const result = await issueConventionValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Bash commands without gh issue create', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'git status' },
      };

      const result = await issueConventionValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should always allow gh issue create with warnings', async () => {
      mockedExecSync.mockReturnValue('[]');

      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: {
          command:
            'gh issue create --title "[hooks] feat: add validation" --body "## Problem\nbroken\n## Solution\nfix\n## Acceptance Criteria\ndone\n## Source\nme"',
        },
      };

      const result = await issueConventionValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(result.hookSpecificOutput.permissionDecisionReason).toBe(
        'Issue convention warnings logged'
      );
    });

    it('should allow even with invalid title (WARN enforcement)', async () => {
      mockedExecSync.mockReturnValue('[]');

      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: {
          command: 'gh issue create --title "Bad Title" --body "no sections"',
        },
      };

      const result = await issueConventionValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
