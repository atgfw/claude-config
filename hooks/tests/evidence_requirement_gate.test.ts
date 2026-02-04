/**
 * Tests for Evidence Requirement Gate Hook
 */

import { describe, it, expect } from 'vitest';
import {
  hasEvidence,
  isCompletionUpdate,
  isIssueCloseCommand,
  evidenceRequirementGate,
} from '../src/hooks/evidence_requirement_gate.js';

describe('hasEvidence', () => {
  it('returns valid when all evidence present', () => {
    const text = `
      Completed implementation.
      File: hooks/src/hooks/my_hook.ts:42
      Verbatim: \`export function myHook()\`
      Verified with grep
    `;
    const result = hasEvidence(text);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('returns missing file reference', () => {
    const text = 'Completed. Code: `export function foo()`';
    const result = hasEvidence(text);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('file reference (file_path:line_number)');
  });

  it('returns missing verbatim quote', () => {
    const text = 'Completed. See hooks/src/file.ts:42';
    const result = hasEvidence(text);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('verbatim code quote (backticks)');
  });

  it('accepts code blocks as verbatim', () => {
    const text = `
      File: src/index.ts:1
      \`\`\`typescript
      export function main() {}
      \`\`\`
    `;
    const result = hasEvidence(text);
    expect(result.valid).toBe(true);
  });

  it('accepts Windows paths', () => {
    const text = `
      File: C:\\Users\\codya\\.claude\\hooks\\src\\hook.ts:42
      Code: \`registerHook('test', 'PreToolUse', fn)\`
    `;
    const result = hasEvidence(text);
    expect(result.valid).toBe(true);
  });
});

describe('isCompletionUpdate', () => {
  it('returns true for status=completed', () => {
    expect(isCompletionUpdate({ status: 'completed' })).toBe(true);
  });

  it('returns false for status=in_progress', () => {
    expect(isCompletionUpdate({ status: 'in_progress' })).toBe(false);
  });

  it('returns false for no status', () => {
    expect(isCompletionUpdate({ description: 'update' })).toBe(false);
  });
});

describe('isIssueCloseCommand', () => {
  it('detects gh issue close', () => {
    expect(isIssueCloseCommand('gh issue close 42')).toBe(true);
  });

  it('detects gh issue close with comment', () => {
    expect(isIssueCloseCommand('gh issue close 42 --comment "done"')).toBe(true);
  });

  it('returns false for gh issue view', () => {
    expect(isIssueCloseCommand('gh issue view 42')).toBe(false);
  });

  it('returns false for non-gh commands', () => {
    expect(isIssueCloseCommand('git commit -m "close issue"')).toBe(false);
  });
});

describe('evidenceRequirementGate', () => {
  it('allows TaskUpdate with evidence in description', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'TaskUpdate',
      tool_input: {
        taskId: '1',
        status: 'completed',
        description: 'Done. File: hooks/src/hook.ts:42 Code: `export function test()`',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it('blocks TaskUpdate completion without evidence', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'TaskUpdate',
      tool_input: {
        taskId: '1',
        status: 'completed',
        description: 'Done',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('evidence');
  });

  it('allows TaskUpdate with evidence in metadata', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'TaskUpdate',
      tool_input: {
        taskId: '1',
        status: 'completed',
        metadata: {
          evidence: 'File: src/main.ts:1',
          verbatim: '`export const x = 1`',
        },
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it('allows non-completion TaskUpdate without evidence', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'TaskUpdate',
      tool_input: {
        taskId: '1',
        status: 'in_progress',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it('blocks gh issue close without evidence', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'Bash',
      tool_input: {
        command: 'gh issue close 42 --comment "Done"',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('allows gh issue close with evidence', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'Bash',
      tool_input: {
        command: 'gh issue close 42 --comment "Done. File: src/hook.ts:1 Code: `export fn`"',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it('allows non-issue-close Bash commands', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'Bash',
      tool_input: {
        command: 'git status',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it('allows other tools without restriction', async () => {
    const result = await evidenceRequirementGate({
      tool_name: 'Read',
      tool_input: {
        file_path: '/some/file.ts',
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });
});
