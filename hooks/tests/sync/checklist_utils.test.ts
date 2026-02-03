import { describe, it, expect } from 'vitest';
import {
  normalizeItemText,
  generateItemId,
  computeChecklistHash,
  createChecklistItem,
  parseCheckboxStatus,
  formatCheckboxStatus,
  diffChecklists,
  resolveConflict,
  mergeChecklists,
} from '../../src/sync/checklist_utils.js';
import type { ChecklistItem } from '../../src/github/task_source_sync.js';

describe('normalizeItemText', () => {
  it('trims whitespace', () => {
    expect(normalizeItemText('  hello world  ')).toBe('hello world');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeItemText('hello   world')).toBe('hello world');
  });

  it('strips leading markdown', () => {
    expect(normalizeItemText('**bold text')).toBe('bold text');
    expect(normalizeItemText('- list item')).toBe('list item');
    expect(normalizeItemText('# heading')).toBe('heading');
  });

  it('strips trailing markdown', () => {
    expect(normalizeItemText('text**')).toBe('text');
    expect(normalizeItemText('text___')).toBe('text');
  });

  it('lowercases text', () => {
    expect(normalizeItemText('Hello World')).toBe('hello world');
  });
});

describe('generateItemId', () => {
  it('generates consistent IDs for same text', () => {
    const id1 = generateItemId('Add checklist support');
    const id2 = generateItemId('Add checklist support');
    expect(id1).toBe(id2);
  });

  it('generates different IDs for different text', () => {
    const id1 = generateItemId('Task A');
    const id2 = generateItemId('Task B');
    expect(id1).not.toBe(id2);
  });

  it('normalizes before hashing', () => {
    const id1 = generateItemId('  Task A  ');
    const id2 = generateItemId('task a');
    expect(id1).toBe(id2);
  });

  it('returns 12 character hex string', () => {
    const id = generateItemId('test');
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[a-f0-9]{12}$/);
  });
});

describe('computeChecklistHash', () => {
  it('returns empty string for empty list', () => {
    expect(computeChecklistHash([])).toBe('');
  });

  it('returns consistent hash for same items', () => {
    const items: ChecklistItem[] = [
      createChecklistItem('Task A', 'pending'),
      createChecklistItem('Task B', 'completed'),
    ];
    const hash1 = computeChecklistHash(items);
    const hash2 = computeChecklistHash(items);
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different statuses', () => {
    const items1: ChecklistItem[] = [createChecklistItem('Task A', 'pending')];
    const items2: ChecklistItem[] = [createChecklistItem('Task A', 'completed')];
    const hash1 = computeChecklistHash(items1);
    const hash2 = computeChecklistHash(items2);
    expect(hash1).not.toBe(hash2);
  });

  it('is order-independent', () => {
    const itemA = createChecklistItem('Task A', 'pending');
    const itemB = createChecklistItem('Task B', 'completed');
    const hash1 = computeChecklistHash([itemA, itemB]);
    const hash2 = computeChecklistHash([itemB, itemA]);
    expect(hash1).toBe(hash2);
  });

  it('returns 16 character hex string', () => {
    const items: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const hash = computeChecklistHash(items);
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('createChecklistItem', () => {
  it('creates item with defaults', () => {
    const item = createChecklistItem('My task');
    expect(item.text).toBe('My task');
    expect(item.status).toBe('pending');
    expect(item.modified_by).toBe('claude_task');
    expect(item.id).toHaveLength(12);
    expect(item.last_modified).toBeTruthy();
  });

  it('accepts custom status and modifier', () => {
    const item = createChecklistItem('My task', 'completed', 'github_issue');
    expect(item.status).toBe('completed');
    expect(item.modified_by).toBe('github_issue');
  });

  it('trims text', () => {
    const item = createChecklistItem('  spaced task  ');
    expect(item.text).toBe('spaced task');
  });
});

describe('parseCheckboxStatus', () => {
  it('parses space as pending', () => {
    expect(parseCheckboxStatus(' ')).toBe('pending');
    expect(parseCheckboxStatus('')).toBe('pending');
  });

  it('parses x as completed', () => {
    expect(parseCheckboxStatus('x')).toBe('completed');
    expect(parseCheckboxStatus('X')).toBe('completed');
  });

  it('parses dash as in_progress', () => {
    expect(parseCheckboxStatus('-')).toBe('in_progress');
  });
});

describe('formatCheckboxStatus', () => {
  it('formats pending as space', () => {
    expect(formatCheckboxStatus('pending')).toBe(' ');
  });

  it('formats completed as x', () => {
    expect(formatCheckboxStatus('completed')).toBe('x');
  });

  it('formats in_progress as dash', () => {
    expect(formatCheckboxStatus('in_progress')).toBe('-');
  });
});

describe('diffChecklists', () => {
  it('identifies added items', () => {
    const registry: ChecklistItem[] = [];
    const artifact: ChecklistItem[] = [createChecklistItem('New task')];
    const diff = diffChecklists(registry, artifact);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.text).toBe('New task');
  });

  it('identifies removed items', () => {
    const registry: ChecklistItem[] = [createChecklistItem('Old task')];
    const artifact: ChecklistItem[] = [];
    const diff = diffChecklists(registry, artifact);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.text).toBe('Old task');
  });

  it('identifies status changes', () => {
    const registry: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const artifact: ChecklistItem[] = [createChecklistItem('Task', 'completed')];
    const diff = diffChecklists(registry, artifact);
    expect(diff.statusChanged).toHaveLength(1);
    expect(diff.statusChanged[0]?.oldStatus).toBe('pending');
    expect(diff.statusChanged[0]?.newStatus).toBe('completed');
  });

  it('identifies unchanged items', () => {
    const registry: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const artifact: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const diff = diffChecklists(registry, artifact);
    expect(diff.unchanged).toHaveLength(1);
  });
});

describe('resolveConflict', () => {
  it('returns newer item', () => {
    const older: ChecklistItem = {
      ...createChecklistItem('Task'),
      last_modified: '2026-01-01T00:00:00.000Z',
    };
    const newer: ChecklistItem = {
      ...createChecklistItem('Task'),
      last_modified: '2026-02-01T00:00:00.000Z',
    };
    expect(resolveConflict(older, newer)).toBe(newer);
    expect(resolveConflict(newer, older)).toBe(newer);
  });

  it('returns first item on tie', () => {
    const item1: ChecklistItem = {
      ...createChecklistItem('Task'),
      last_modified: '2026-01-01T00:00:00.000Z',
    };
    const item2: ChecklistItem = {
      ...createChecklistItem('Task'),
      last_modified: '2026-01-01T00:00:00.000Z',
    };
    expect(resolveConflict(item1, item2)).toBe(item1);
  });
});

describe('mergeChecklists', () => {
  it('includes unchanged items', () => {
    const registry: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const artifact: ChecklistItem[] = [createChecklistItem('Task', 'pending')];
    const merged = mergeChecklists(registry, artifact);
    expect(merged).toHaveLength(1);
  });

  it('includes new items from artifact', () => {
    const registry: ChecklistItem[] = [createChecklistItem('Old', 'pending')];
    const artifact: ChecklistItem[] = [
      createChecklistItem('Old', 'pending'),
      createChecklistItem('New', 'pending'),
    ];
    const merged = mergeChecklists(registry, artifact);
    expect(merged).toHaveLength(2);
  });

  it('does not include removed items', () => {
    const registry: ChecklistItem[] = [
      createChecklistItem('Keep', 'pending'),
      createChecklistItem('Remove', 'pending'),
    ];
    const artifact: ChecklistItem[] = [createChecklistItem('Keep', 'pending')];
    const merged = mergeChecklists(registry, artifact);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe('Keep');
  });

  it('resolves status conflicts with newest wins', () => {
    const registryItem: ChecklistItem = {
      ...createChecklistItem('Task', 'pending'),
      last_modified: '2026-02-01T00:00:00.000Z',
    };
    const artifactItem: ChecklistItem = {
      ...createChecklistItem('Task', 'completed'),
      last_modified: '2026-01-01T00:00:00.000Z',
    };
    const merged = mergeChecklists([registryItem], [artifactItem]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe('pending'); // Registry is newer
  });
});
