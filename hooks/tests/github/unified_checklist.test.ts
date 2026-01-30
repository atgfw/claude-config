import { describe, it, expect } from 'vitest';
import {
  createItem,
  renderToGitHubBody,
  renderToTaskCreate,
  renderToTasksMd,
  renderToPlanSteps,
  parseFromGitHubIssue,
  parseFromTasksMd,
  type UnifiedChecklistItem,
} from '../../src/github/unified_checklist.js';

function makeItem(overrides: Partial<UnifiedChecklistItem> = {}): UnifiedChecklistItem {
  return createItem({
    title: 'Test item',
    system: 'n8n',
    type: 'feature',
    priority: 'p1',
    acceptance_criteria: [
      { text: 'First criterion', done: false },
      { text: 'Second criterion', done: true },
    ],
    sources: {
      github_issue: 42,
      claude_task: null,
      openspec_change: 'add-tool-research-gate',
      plan_step: null,
    },
    ...overrides,
  });
}

describe('createItem', () => {
  it('generates an id and timestamps', () => {
    const item = createItem({ title: 'Hello' });
    expect(item.id).toBeTruthy();
    expect(item.created).toBeTruthy();
    expect(item.updated).toBeTruthy();
  });

  it('applies defaults for missing fields', () => {
    const item = createItem({ title: 'Defaults test' });
    expect(item.status).toBe('pending');
    expect(item.priority).toBe('p2');
    expect(item.system).toBe('');
    expect(item.type).toBe('');
    expect(item.acceptance_criteria).toEqual([]);
    expect(item.sources.github_issue).toBeNull();
    expect(item.sources.claude_task).toBeNull();
    expect(item.sources.openspec_change).toBeNull();
    expect(item.sources.plan_step).toBeNull();
  });

  it('respects provided values', () => {
    const item = createItem({
      title: 'Custom',
      status: 'blocked',
      priority: 'p0',
      system: 'servicetitan',
    });
    expect(item.status).toBe('blocked');
    expect(item.priority).toBe('p0');
    expect(item.system).toBe('servicetitan');
  });
});

describe('renderToGitHubBody', () => {
  it('renders all sections', () => {
    const item = makeItem();
    const body = renderToGitHubBody(item);
    expect(body).toContain('## Problem');
    expect(body).toContain('Test item');
    expect(body).toContain('## Solution');
    expect(body).toContain('<pending implementation>');
    expect(body).toContain('## Acceptance Criteria');
    expect(body).toContain('- [ ] First criterion');
    expect(body).toContain('- [x] Second criterion');
    expect(body).toContain('## Source');
    expect(body).toContain('- OpenSpec: add-tool-research-gate');
  });

  it('shows N/A for null openspec', () => {
    const item = makeItem({
      sources: { github_issue: null, claude_task: null, openspec_change: null, plan_step: null },
    });
    const body = renderToGitHubBody(item);
    expect(body).toContain('- OpenSpec: N/A');
  });

  it('handles empty acceptance criteria', () => {
    const item = makeItem({ acceptance_criteria: [] });
    const body = renderToGitHubBody(item);
    expect(body).toContain('_No criteria defined._');
  });
});

describe('renderToTaskCreate', () => {
  it('returns subject, description, activeForm', () => {
    const item = makeItem({ status: 'in_progress' });
    const result = renderToTaskCreate(item);
    expect(result.subject).toBe('Test item');
    expect(result.activeForm).toBe('active');
    expect(result.description).toContain('Priority: p1');
    expect(result.description).toContain('System: n8n');
  });

  it('maps non-in_progress to backlog', () => {
    const item = makeItem({ status: 'pending' });
    expect(renderToTaskCreate(item).activeForm).toBe('backlog');
  });
});

describe('renderToTasksMd', () => {
  it('renders completed items as checked', () => {
    const items = [
      makeItem({ title: 'Done', status: 'completed' }),
      makeItem({ title: 'Not done', status: 'pending' }),
    ];
    const md = renderToTasksMd(items);
    expect(md).toBe('- [x] Done\n- [ ] Not done');
  });

  it('handles empty array', () => {
    expect(renderToTasksMd([])).toBe('');
  });
});

describe('renderToPlanSteps', () => {
  it('renders numbered steps', () => {
    const items = [makeItem({ title: 'Step A' }), makeItem({ title: 'Step B' })];
    const plan = renderToPlanSteps(items);
    expect(plan).toBe('1. Step A\n2. Step B');
  });
});

describe('parseFromGitHubIssue', () => {
  it('extracts criteria from body checkboxes', () => {
    const item = parseFromGitHubIssue({
      number: 10,
      title: 'Fix login',
      body: '## Acceptance Criteria\n- [ ] Must redirect\n- [x] Must log event',
      state: 'open',
      labels: [],
    });
    expect(item.sources.github_issue).toBe(10);
    expect(item.acceptance_criteria).toHaveLength(2);
    expect(item.acceptance_criteria[0]).toEqual({ text: 'Must redirect', done: false });
    expect(item.acceptance_criteria[1]).toEqual({ text: 'Must log event', done: true });
    expect(item.status).toBe('in_progress');
  });

  it('maps closed state to completed', () => {
    const item = parseFromGitHubIssue({
      number: 1,
      title: 'Done',
      body: '',
      state: 'closed',
      labels: [],
    });
    expect(item.status).toBe('completed');
  });

  it('extracts system, type, priority from labels', () => {
    const item = parseFromGitHubIssue({
      number: 5,
      title: 'Task',
      body: '',
      state: 'open',
      labels: [{ name: 'system:n8n' }, { name: 'type:bug' }, { name: 'p0' }],
    });
    expect(item.system).toBe('n8n');
    expect(item.type).toBe('bug');
    expect(item.priority).toBe('p0');
  });

  it('extracts openspec from body', () => {
    const item = parseFromGitHubIssue({
      number: 3,
      title: 'X',
      body: '## Source\n- OpenSpec: my-change-id',
      state: 'open',
      labels: [],
    });
    expect(item.sources.openspec_change).toBe('my-change-id');
  });

  it('handles empty body', () => {
    const item = parseFromGitHubIssue({
      number: 99,
      title: 'Empty',
      body: '',
      state: 'open',
      labels: [],
    });
    expect(item.acceptance_criteria).toHaveLength(0);
    expect(item.status).toBe('pending');
  });

  it('handles malformed title gracefully', () => {
    const item = parseFromGitHubIssue({
      number: 7,
      title: '',
      body: '',
      state: 'open',
      labels: [],
    });
    expect(item.title).toBe('');
  });
});

describe('parseFromTasksMd', () => {
  it('parses checked and unchecked items', () => {
    const md = '- [ ] Pending item\n- [x] Done item\n- [X] Also done';
    const items = parseFromTasksMd(md);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Pending item');
    expect(items[0].status).toBe('pending');
    expect(items[1].title).toBe('Done item');
    expect(items[1].status).toBe('completed');
    expect(items[2].title).toBe('Also done');
    expect(items[2].status).toBe('completed');
  });

  it('ignores non-task lines', () => {
    const md = '# Header\nSome text\n- [ ] Only task\n\nMore text';
    const items = parseFromTasksMd(md);
    expect(items).toHaveLength(1);
  });

  it('handles empty string', () => {
    expect(parseFromTasksMd('')).toEqual([]);
  });
});

describe('round-trip', () => {
  it('create -> renderToTasksMd -> parseFromTasksMd preserves title and status', () => {
    const original = [
      createItem({ title: 'Alpha', status: 'completed' }),
      createItem({ title: 'Beta', status: 'pending' }),
    ];
    const md = renderToTasksMd(original);
    const parsed = parseFromTasksMd(md);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe('Alpha');
    expect(parsed[0].status).toBe('completed');
    expect(parsed[1].title).toBe('Beta');
    expect(parsed[1].status).toBe('pending');
  });

  it('create -> renderToGitHubBody -> parseFromGitHubIssue preserves criteria', () => {
    const original = makeItem();
    const body = renderToGitHubBody(original);
    const parsed = parseFromGitHubIssue({
      number: 1,
      title: original.title,
      body,
      state: 'open',
      labels: [
        { name: `system:${original.system}` },
        { name: `type:${original.type}` },
        { name: original.priority },
      ],
    });
    expect(parsed.title).toBe(original.title);
    expect(parsed.system).toBe(original.system);
    expect(parsed.type).toBe(original.type);
    expect(parsed.priority).toBe(original.priority);
    expect(parsed.acceptance_criteria).toHaveLength(original.acceptance_criteria.length);
    expect(parsed.acceptance_criteria[0].text).toBe('First criterion');
    expect(parsed.acceptance_criteria[0].done).toBe(false);
    expect(parsed.acceptance_criteria[1].text).toBe('Second criterion');
    expect(parsed.acceptance_criteria[1].done).toBe(true);
    expect(parsed.sources.openspec_change).toBe('add-tool-research-gate');
  });
});
