# Spec Delta: issue-crud-automation

**Capability:** `issue-crud-automation`
**Change ID:** `add-github-issue-tracking-system`

## ADDED Requirements

### Requirement: Auto-create issue from correction ledger entry

When a new entry is written to `correction-ledger.json`, the system MUST automatically create a GitHub issue with:
- Title derived from correction description
- Labels: `source/correction-ledger`, `priority/p1-high`, `type/fix`
- Body: structured template with correction details

#### Scenario: Correction triggers issue

Given a new correction `{ "description": "Hook missed emoji in output", "system": "hooks" }` is added
When the auto-creator runs
Then a GitHub issue `[hooks] fix: hook missed emoji in output` is created
And it has labels `source/correction-ledger`, `priority/p1-high`, `type/fix`, `system/hooks`

### Requirement: Auto-create issue from escalation (severity >= high)

When an escalation with severity `high` or `critical` is detected, the system MUST create a GitHub issue.

#### Scenario: High severity escalation

Given an escalation `{ "severity": "high", "category": "governance", "description": "Repeated webhook auth bypass" }`
When the auto-creator runs
Then a GitHub issue `[governance] fix: repeated webhook auth bypass` is created
And it has labels `source/escalation`, `priority/p1-high`

#### Scenario: Low severity escalation skipped

Given an escalation with severity `low`
When the auto-creator evaluates
Then no issue is created

### Requirement: Auto-create issue from OpenSpec proposal

When a new OpenSpec change is created under `openspec/changes/`, the system MUST create a tracking issue.

#### Scenario: OpenSpec triggers issue

Given a new change `add-github-issue-tracking-system` with proposal.md
When the auto-creator detects the new change directory
Then a GitHub issue `[infra] feat: github issue tracking and unified task sync` is created
And it has labels `source/openspec`, `lifecycle/specced`

### Requirement: Auto-close issue on task completion

When a Claude Code task linked in the sync registry is marked completed, the system MUST close the corresponding GitHub issue.

#### Scenario: Task completion closes issue

Given Claude task `task-abc` is linked to GitHub issue #30 in `issue-sync-registry.json`
When `TaskUpdate({ taskId: "task-abc", status: "completed" })` runs
Then `gh issue close 30 --reason completed` executes

### Requirement: Auto-close issue on OpenSpec archive

When an OpenSpec change is archived, the system MUST close all linked GitHub issues.

#### Scenario: Archive closes linked issues

Given OpenSpec change `add-github-issue-tracking-system` is linked to issue #30
When `openspec archive add-github-issue-tracking-system` runs
Then issue #30 is closed

### Requirement: Duplicate detection prevents redundant issues

Before auto-creating, the system MUST search open issues for >80% keyword overlap. Skip if duplicate found.

#### Scenario: Duplicate prevented

Given open issue #24 `[governance] feat: add LLM model validator hook` exists
When auto-creator tries to create `[governance] feat: implement LLM model validator`
Then creation is skipped with `[!] Duplicate: #24`
