import { describe, it, expect } from 'vitest';
import {
  extractLifecycle,
  extractPriority,
  priorityRank,
  buildRows,
  renderKanban,
} from '../../src/github/issue_kanban.js';

describe('issue_kanban', () => {
  describe('extractLifecycle', () => {
    it('returns done for closed issues', () => {
      expect(extractLifecycle([], 'CLOSED')).toBe('done');
    });

    it('returns triage for open issues with no lifecycle label', () => {
      expect(extractLifecycle([], 'OPEN')).toBe('triage');
    });

    it('maps lifecycle labels correctly', () => {
      expect(extractLifecycle([{ name: 'lifecycle/specced' }], 'OPEN')).toBe('specced');
      expect(extractLifecycle([{ name: 'lifecycle/in-progress' }], 'OPEN')).toBe('in-progress');
      expect(extractLifecycle([{ name: 'lifecycle/blocked' }], 'OPEN')).toBe('blocked');
      expect(extractLifecycle([{ name: 'lifecycle/needs-review' }], 'OPEN')).toBe('needs-review');
      expect(extractLifecycle([{ name: 'lifecycle/triage' }], 'OPEN')).toBe('triage');
    });

    it('ignores non-lifecycle labels', () => {
      expect(extractLifecycle([{ name: 'type/feat' }, { name: 'priority/p1-high' }], 'OPEN')).toBe(
        'triage'
      );
    });
  });

  describe('extractPriority', () => {
    it('returns priority shorthand', () => {
      expect(extractPriority([{ name: 'priority/p0-critical' }])).toBe('p0-critical');
      expect(extractPriority([{ name: 'priority/p3-low' }])).toBe('p3-low');
    });

    it('returns -- for no priority label', () => {
      expect(extractPriority([{ name: 'type/feat' }])).toBe('--');
      expect(extractPriority([])).toBe('--');
    });
  });

  describe('priorityRank', () => {
    it('returns correct rank ordering', () => {
      expect(priorityRank([{ name: 'priority/p0-critical' }])).toBe(0);
      expect(priorityRank([{ name: 'priority/p1-high' }])).toBe(1);
      expect(priorityRank([{ name: 'priority/p2-medium' }])).toBe(2);
      expect(priorityRank([{ name: 'priority/p3-low' }])).toBe(3);
    });

    it('returns 99 for unlabeled', () => {
      expect(priorityRank([])).toBe(99);
    });
  });

  describe('buildRows', () => {
    it('sorts by priority rank', () => {
      const issues = [
        { number: 1, title: 'Low', state: 'OPEN', labels: [{ name: 'priority/p3-low' }] },
        { number: 2, title: 'Critical', state: 'OPEN', labels: [{ name: 'priority/p0-critical' }] },
        { number: 3, title: 'High', state: 'OPEN', labels: [{ name: 'priority/p1-high' }] },
      ];

      const rows = buildRows(issues);
      expect(rows[0].number).toBe(2);
      expect(rows[1].number).toBe(3);
      expect(rows[2].number).toBe(1);
    });

    it('truncates long titles', () => {
      const issues = [{ number: 1, title: 'A'.repeat(60), state: 'OPEN', labels: [] }];

      const rows = buildRows(issues);
      expect(rows[0].title).toHaveLength(50);
      expect(rows[0].title).toMatch(/\.\.\.$/);
    });

    it('preserves short titles', () => {
      const issues = [{ number: 1, title: 'Short title', state: 'OPEN', labels: [] }];

      const rows = buildRows(issues);
      expect(rows[0].title).toBe('Short title');
    });
  });

  describe('renderKanban', () => {
    it('returns message for empty rows', () => {
      expect(renderKanban([])).toBe('No issues found.');
    });

    it('renders grouped sections with headers', () => {
      const rows = [
        { number: 1, title: 'Fix bug', priority: 'p1-high', column: 'triage' as const, rank: 1 },
        {
          number: 2,
          title: 'Add feat',
          priority: 'p2-medium',
          column: 'in-progress' as const,
          rank: 2,
        },
        { number: 3, title: 'Old issue', priority: '--', column: 'done' as const, rank: 99 },
      ];

      const result = renderKanban(rows);
      expect(result).toContain('## Issue Board');
      expect(result).toContain('### Triage (1)');
      expect(result).toContain('### In Prog (1)');
      expect(result).toContain('### Done (1)');
      expect(result).toContain('| 1 | Fix bug | p1-high |');
    });

    it('omits empty columns', () => {
      const rows = [
        { number: 1, title: 'Only triage', priority: '--', column: 'triage' as const, rank: 99 },
      ];

      const result = renderKanban(rows);
      expect(result).toContain('### Triage (1)');
      expect(result).not.toContain('### Blocked');
      expect(result).not.toContain('### Done');
    });
  });
});
