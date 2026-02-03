import { describe, it, expect } from 'vitest';
import {
  parseGitHubChecklist,
  parseOpenSpecTasks,
  parsePlanChecklist,
  parseClaudeTasks,
  renderToGitHubChecklist,
  renderToOpenSpecTasks,
  renderToPlanChecklist,
  extractChecklistSection,
  replaceChecklistSection,
} from '../../src/sync/checklist_parsers.js';
import { createChecklistItem } from '../../src/sync/checklist_utils.js';

describe('parseGitHubChecklist', () => {
  it('parses pending items', () => {
    const body = '- [ ] Task one\n- [ ] Task two';
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(2);
    expect(items[0]?.text).toBe('Task one');
    expect(items[0]?.status).toBe('pending');
    expect(items[0]?.modified_by).toBe('github_issue');
  });

  it('parses completed items', () => {
    const body = '- [x] Done task\n- [X] Also done';
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(2);
    expect(items[0]?.status).toBe('completed');
    expect(items[1]?.status).toBe('completed');
  });

  it('parses in_progress items', () => {
    const body = '- [-] In progress task';
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe('in_progress');
  });

  it('handles mixed content', () => {
    const body = `
## Problem
Some description

## Acceptance Criteria
- [ ] First task
- [x] Second task done
- [ ] Third task

## Notes
More text
`;
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(3);
    expect(items[0]?.text).toBe('First task');
    expect(items[1]?.status).toBe('completed');
  });

  it('handles asterisk bullets', () => {
    const body = '* [ ] Task with asterisk';
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('Task with asterisk');
  });

  it('handles indented items', () => {
    const body = '  - [ ] Indented task';
    const items = parseGitHubChecklist(body);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('Indented task');
  });
});

describe('parseOpenSpecTasks', () => {
  it('parses numbered checkbox items', () => {
    const content = `
## 1. Section Header

- [ ] 1.1 First task
- [x] 1.2 Second task done
- [ ] 1.3 Third task

## 2. Another Section

- [ ] 2.1 Another task
`;
    const items = parseOpenSpecTasks(content);
    expect(items).toHaveLength(4);
    expect(items[0]?.text).toBe('1.1 First task');
    expect(items[0]?.modified_by).toBe('openspec');
    expect(items[1]?.status).toBe('completed');
  });

  it('skips section headers', () => {
    const content = '## 1. This is a header\n- [ ] This is a task';
    const items = parseOpenSpecTasks(content);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('This is a task');
  });
});

describe('parsePlanChecklist', () => {
  it('parses checkbox items', () => {
    const content = `
# Plan Title

- [ ] Step one
- [x] Step two done
- [ ] Step three
`;
    const items = parsePlanChecklist(content);
    expect(items).toHaveLength(3);
    expect(items[0]?.text).toBe('Step one');
    expect(items[0]?.modified_by).toBe('plan');
    expect(items[1]?.status).toBe('completed');
  });

  it('parses numbered list items', () => {
    const content = `
# Plan

1. First step
2. Second step
3. Third step
`;
    const items = parsePlanChecklist(content);
    expect(items).toHaveLength(3);
    expect(items[0]?.text).toBe('First step');
    expect(items[0]?.status).toBe('pending');
  });

  it('does not double-capture checkbox items as numbered', () => {
    const content = '- [ ] 1. Task text';
    const items = parsePlanChecklist(content);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('1. Task text');
  });
});

describe('parseClaudeTasks', () => {
  it('converts Claude tasks to checklist items', () => {
    const tasks = [
      { id: '1', subject: 'First task', status: 'pending' as const },
      { id: '2', subject: 'Second task', status: 'completed' as const },
      { id: '3', subject: 'Third task', status: 'in_progress' as const },
    ];
    const items = parseClaudeTasks(tasks);
    expect(items).toHaveLength(3);
    expect(items[0]?.id).toBe('claude-1');
    expect(items[0]?.text).toBe('First task');
    expect(items[0]?.status).toBe('pending');
    expect(items[1]?.status).toBe('completed');
    expect(items[2]?.status).toBe('in_progress');
  });
});

describe('renderToGitHubChecklist', () => {
  it('renders items as checkbox list', () => {
    const items = [
      createChecklistItem('Pending task', 'pending'),
      createChecklistItem('Done task', 'completed'),
      createChecklistItem('Active task', 'in_progress'),
    ];
    const rendered = renderToGitHubChecklist(items);
    expect(rendered).toContain('- [ ] Pending task');
    expect(rendered).toContain('- [x] Done task');
    expect(rendered).toContain('- [-] Active task');
  });
});

describe('renderToOpenSpecTasks', () => {
  it('renders items as checkbox list', () => {
    const items = [
      createChecklistItem('1.1 Task one', 'pending'),
      createChecklistItem('1.2 Task two', 'completed'),
    ];
    const rendered = renderToOpenSpecTasks(items);
    expect(rendered).toContain('- [ ] 1.1 Task one');
    expect(rendered).toContain('- [x] 1.2 Task two');
  });
});

describe('renderToPlanChecklist', () => {
  it('renders items as checkbox list', () => {
    const items = [
      createChecklistItem('Step one', 'pending'),
      createChecklistItem('Step two', 'completed'),
    ];
    const rendered = renderToPlanChecklist(items);
    expect(rendered).toContain('- [ ] Step one');
    expect(rendered).toContain('- [x] Step two');
  });
});

describe('extractChecklistSection', () => {
  it('extracts acceptance criteria section', () => {
    const body = `
## Problem
Description

## Acceptance Criteria
- [ ] Task one
- [ ] Task two

## Notes
More text
`;
    const result = extractChecklistSection(body);
    expect(result.checklist).toContain('- [ ] Task one');
    expect(result.checklist).toContain('- [ ] Task two');
    expect(result.before).toContain('## Problem');
    expect(result.after).toContain('## Notes');
  });

  it('handles body with only checkboxes', () => {
    const body = '- [ ] Task one\n- [x] Task two';
    const result = extractChecklistSection(body);
    expect(result.checklist).toBe('- [ ] Task one\n- [x] Task two');
  });

  it('handles body with no checklist', () => {
    const body = 'Just some text without checkboxes';
    const result = extractChecklistSection(body);
    expect(result.before).toBe(body);
    expect(result.checklist).toBe('');
    expect(result.after).toBe('');
  });
});

describe('replaceChecklistSection', () => {
  it('replaces checklist in body', () => {
    const body = `## Acceptance Criteria
- [ ] Old task

## Notes
text`;
    const newChecklist = '- [x] New task done\n- [ ] Another task';
    const result = replaceChecklistSection(body, newChecklist);
    expect(result).toContain('- [x] New task done');
    expect(result).toContain('- [ ] Another task');
    expect(result).not.toContain('Old task');
    expect(result).toContain('## Notes');
  });
});
