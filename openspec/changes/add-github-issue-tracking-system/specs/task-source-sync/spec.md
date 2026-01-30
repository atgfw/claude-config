# Spec Delta: task-source-sync

**Capability:** `task-source-sync`
**Change ID:** `add-github-issue-tracking-system`

## ADDED Requirements

### Requirement: Sync registry tracks cross-source mappings

`ledger/issue-sync-registry.json` MUST map unified IDs to each source's native ID. Updated on every sync event.

#### Scenario: New mapping created

Given a GitHub issue #30 is created for OpenSpec change `add-github-issue-tracking-system`
When the sync runs
Then `issue-sync-registry.json` contains an entry with `github_issue: 30` and `openspec_change_id: "add-github-issue-tracking-system"`

### Requirement: Session start syncs GitHub to local

On session start, the system MUST fetch all open GitHub issues and reconcile against local sync registry. Create missing local representations, update stale ones.

#### Scenario: New remote issue synced

Given GitHub has open issue #31 not in sync registry
When session start sync runs
Then a sync entry is created for #31

#### Scenario: Closed remote issue synced

Given GitHub issue #25 is closed but sync registry shows it as open
When session start sync runs
Then the sync entry is marked completed

### Requirement: Task completion propagates to GitHub

When a Claude Code `TaskUpdate` sets status to `completed`, and the task is linked in the sync registry, the system MUST close the corresponding GitHub issue.

#### Scenario: Claude task closes GitHub issue

Given task `task-xyz` is linked to issue #30
When `TaskUpdate({ taskId: "task-xyz", status: "completed" })` fires
Then `gh issue close 30` executes

### Requirement: GitHub issue close propagates to local

On session start sync, if a GitHub issue is closed that has a linked Claude task or OpenSpec change, the system MUST mark those as completed locally.

#### Scenario: GitHub close updates OpenSpec

Given issue #30 linked to OpenSpec `add-github-issue-tracking-system` is closed on GitHub
When session start sync runs
Then the OpenSpec tasks.md linked item is marked `- [x]`

### Requirement: Re-entrancy guard prevents circular sync

A guard flag MUST prevent sync operations from triggering further sync operations.

#### Scenario: No circular trigger

Given task completion triggers issue close
When issue close would normally trigger task sync
Then the re-entrancy guard prevents the second sync
