# Spec Delta: unified-checklist-format

**Capability:** `unified-checklist-format`
**Change ID:** `add-github-issue-tracking-system`

## ADDED Requirements

### Requirement: Unified checklist item schema

All task sources MUST produce and consume a common JSON schema with fields: `id`, `title`, `status`, `priority`, `system`, `type`, `sources` (mapping to each source's native ID), `acceptance_criteria`, `created`, `updated`.

#### Scenario: Schema covers all sources

Given a unified checklist item
Then it has `sources.github_issue` (number or null), `sources.claude_task` (string or null), `sources.openspec_change` (string or null), `sources.plan_step` (number or null)

### Requirement: Render to GitHub issue body

A unified checklist item MUST render to a GitHub issue body with `## Problem`, `## Solution`, `## Acceptance Criteria` (checkboxes), and `## Source` sections.

#### Scenario: Render acceptance criteria

Given a checklist item with 3 acceptance criteria (2 done, 1 pending)
When rendered to GitHub body
Then the body contains `- [x]` for done items and `- [ ]` for pending

### Requirement: Render to OpenSpec tasks.md

A unified checklist item MUST render to an OpenSpec `tasks.md` line: `- [ ] title` or `- [x] title`.

#### Scenario: Render completed item

Given a checklist item with status `completed`
When rendered to tasks.md format
Then the output is `- [x] <title>`

### Requirement: Render to Claude Code TaskCreate

A unified checklist item MUST render to `TaskCreate` parameters with `subject`, `description` (containing acceptance criteria), and `activeForm`.

#### Scenario: Render to TaskCreate

Given a checklist item with title `Implement label taxonomy` and 2 acceptance criteria
When rendered to TaskCreate format
Then subject is `Implement label taxonomy` and description includes both criteria

### Requirement: Parse from any source

The checklist engine MUST parse a unified item FROM any source format (GitHub issue JSON, TaskList output, tasks.md markdown, plan file).

#### Scenario: Parse from GitHub issue

Given a GitHub issue JSON with title `[hooks] feat: add auto-push` and body containing `## Acceptance Criteria`
When parsed
Then a valid unified checklist item is produced with `system: "hooks"`, `type: "feat"`
