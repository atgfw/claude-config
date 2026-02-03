import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { propagateToFile } from '../../src/sync/checklist_propagator.js';
import { createChecklistItem } from '../../src/sync/checklist_utils.js';
import { saveRegistry, type SyncRegistry } from '../../src/github/task_source_sync.js';

let tempDir: string;
let origClaudeDir: string | undefined;

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'propagator-test-'));
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

describe('propagateToFile', () => {
  it('updates openspec tasks.md file', async () => {
    const filePath = path.join(tempDir, 'tasks.md');
    fs.writeFileSync(
      filePath,
      `## 1. Section

- [ ] Old task one
- [ ] Old task two

## Notes
Some notes
`
    );

    const items = [
      createChecklistItem('New task one', 'completed'),
      createChecklistItem('New task two', 'pending'),
    ];

    const result = await propagateToFile(filePath, items, 'openspec');
    expect(result).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('- [x] New task one');
    expect(content).toContain('- [ ] New task two');
    expect(content).not.toContain('Old task');
  });

  it('updates plan file', async () => {
    const filePath = path.join(tempDir, 'plan.md');
    fs.writeFileSync(
      filePath,
      `# Plan

- [ ] Step one
- [ ] Step two
`
    );

    const items = [
      createChecklistItem('Updated step one', 'completed'),
      createChecklistItem('Updated step two', 'in_progress'),
    ];

    const result = await propagateToFile(filePath, items, 'plan');
    expect(result).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('- [x] Updated step one');
    expect(content).toContain('- [-] Updated step two');
  });

  it('returns false for non-existent file', async () => {
    const result = await propagateToFile('/nonexistent/file.md', [], 'plan');
    expect(result).toBe(false);
  });
});
