import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  checklistReadHook,
  checklistWriteHook,
  parseFilePath,
} from '../../src/hooks/checklist_sync_hooks.js';
import { saveRegistry, type SyncRegistry } from '../../src/github/task_source_sync.js';

let tempDir: string;
let origClaudeDir: string | undefined;

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-hooks-test-'));
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
  const emptyRegistry: SyncRegistry = { version: 1, entries: [] };
  saveRegistry(emptyRegistry);
});

describe('parseFilePath', () => {
  it('parses openspec tasks.md path', () => {
    const result = parseFilePath('/home/user/.claude/openspec/changes/my-change/tasks.md');
    expect(result).toEqual({ type: 'openspec', id: 'my-change' });
  });

  it('parses Windows openspec path', () => {
    const result = parseFilePath(
      'C:\\Users\\test\\.claude\\openspec\\changes\\test-change\\tasks.md'
    );
    expect(result).toEqual({ type: 'openspec', id: 'test-change' });
  });

  it('parses plan file path', () => {
    const result = parseFilePath('/home/user/.claude/plans/my-plan.md');
    expect(result).toEqual({ type: 'plan', id: '/home/user/.claude/plans/my-plan.md' });
  });

  it('returns null for non-matching paths', () => {
    expect(parseFilePath('/some/other/file.md')).toBeNull();
    expect(parseFilePath('/openspec/changes/test/proposal.md')).toBeNull();
  });
});

describe('checklistReadHook', () => {
  it('ignores non-Read tools', async () => {
    const result = await checklistReadHook({
      tool_name: 'Write',
      tool_input: { file_path: '/openspec/changes/test/tasks.md' },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('ignores non-checklist files', async () => {
    const result = await checklistReadHook({
      tool_name: 'Read',
      tool_input: { file_path: '/some/other/file.md' },
      tool_output: '# Content',
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('reconciles on tasks.md read', async () => {
    const result = await checklistReadHook({
      tool_name: 'Read',
      tool_input: { file_path: '/openspec/changes/test/tasks.md' },
      tool_output: '- [ ] Task one\n- [x] Task two',
    });
    // First read always detects drift (no prior sync)
    expect(result.hookSpecificOutput.additionalContext).toContain('drift detected');
  });
});

describe('checklistWriteHook', () => {
  it('ignores non-Write tools', async () => {
    const result = await checklistWriteHook({
      tool_name: 'Read',
      tool_input: { file_path: '/openspec/changes/test/tasks.md' },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('ignores non-checklist files', async () => {
    const result = await checklistWriteHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/some/other/file.md',
        content: '# Content',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it('reconciles on tasks.md write', async () => {
    const result = await checklistWriteHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/openspec/changes/test/tasks.md',
        content: '- [ ] Task one\n- [x] Task two',
      },
    });
    expect(result.hookSpecificOutput.additionalContext).toContain('reconciled');
  });
});
