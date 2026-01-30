# Proposal: GitHub Issue Tracking and Unified Task Synchronization

**Change ID:** `add-github-issue-tracking-system`
**Status:** Draft
**Created:** 2026-01-30

## Summary

Establish an automated GitHub issue lifecycle system with enforced naming, labeling, and body conventions. Unify task tracking across four sources (Claude Code tasks, GitHub issues, OpenSpec proposals, Claude Code plans) into a single checklist format with bidirectional sync. Add a session-start hook that auto-commits and pushes issue/ledger state.

## Motivation

Current state:
- GitHub issues have no naming or body template convention enforced by hooks
- Labels are GitHub defaults (bug, enhancement, etc.) with no domain-specific taxonomy
- No automation creates/closes issues from hook corrections, escalations, or openspec proposals
- Claude Code TaskCreate/TaskUpdate, GitHub issues, OpenSpec tasks.md, and plan-mode checklists are completely disconnected
- Session start does not persist local state to remote (issues, ledger changes go unpushed)
- No single checklist format spans all task sources

Desired state:
- Deterministic issue naming: `[system] scope: description` matching conventional commits
- Domain-specific label taxonomy (priority, system, type, lifecycle)
- CRUD hooks that auto-create issues from corrections/escalations, auto-close from task completion
- Unified checklist format consumed by all four task sources
- Session-start hook auto-commits and pushes `~/.claude` repo state
- Bidirectional sync: completing a Claude Code task marks the GitHub issue, and vice versa

## User Decisions Required

| Decision | Options | Default |
|----------|---------|---------|
| Issue title enforcement | STRICT (block) vs WARN | WARN |
| Auto-create issues from corrections | Yes / No | Yes |
| Auto-push on session start | Always / Prompt / Never | Always |
| Sync direction | Bidirectional / GitHub-authoritative / Local-authoritative | GitHub-authoritative |

## Architecture

```
~/.claude/
    +-- hooks/src/
    |   +-- github/
    |   |   +-- issue_conventions.ts        # Title/body validation
    |   |   +-- label_taxonomy.ts           # Label creation/enforcement
    |   |   +-- issue_crud.ts               # Auto-create/close/update
    |   |   +-- unified_checklist.ts        # Checklist format engine
    |   |   +-- task_source_sync.ts         # 4-way sync logic
    |   +-- hooks/
    |       +-- session_start.ts            # MODIFIED: add auto-push step
    |
    +-- ledger/
    |   +-- issue-sync-registry.json        # NEW: tracks sync state
    |
    +-- github/
    |   +-- templates/
    |   |   +-- ISSUE_TEMPLATE/             # NEW: issue body templates
    |   |   |   +-- hook-proposal.md
    |   |   |   +-- bug-report.md
    |   |   |   +-- feature-request.md
    |   |   |   +-- governance-violation.md
    |   +-- label-taxonomy.json             # NEW: label definitions
    |
    +-- settings.json                       # MODIFIED: new hook matchers
```

## Capabilities (6 Spec Deltas)

1. **issue-conventions** - Title format, body structure, duplicate detection
2. **label-taxonomy** - Domain-specific labels with color coding and auto-assignment
3. **issue-crud-automation** - Auto-create from corrections/escalations, auto-close from completion
4. **unified-checklist-format** - Single format spanning all 4 task sources
5. **task-source-sync** - Bidirectional mapping between Claude Code tasks, GitHub issues, OpenSpec tasks.md, plans
6. **session-start-sync** - Auto-commit and push `~/.claude` on session start

## New Hooks (4)

| Hook | Event | Action |
|------|-------|--------|
| `issue_convention_validator` | PreToolUse (Bash `gh issue create`) | Validates title/body format |
| `issue_auto_creator` | PostToolUse (correction-ledger write, escalation) | Creates GitHub issue from event |
| `task_source_sync` | PostToolUse (TaskUpdate, `gh issue close`) | Syncs completion across sources |
| `session_start` (modified) | SessionStart | Adds auto-commit/push step |

## Modified Hooks (1)

| Hook | Change |
|------|--------|
| `session_start.ts` | Add Step 9: git add/commit/push `~/.claude` repo |

## New Ledger (1)

| Ledger | Purpose |
|--------|---------|
| `issue-sync-registry.json` | Maps Claude task IDs to GitHub issue numbers, OpenSpec change IDs, and plan step indices |

## Risks

| Risk | Mitigation |
|------|------------|
| Push conflicts on session start | Pull --rebase before push, skip on conflict |
| Rate limiting on `gh` CLI | Batch operations, cache issue state locally |
| Stale sync state | GitHub-authoritative: remote wins on conflict |
| Circular sync triggers | Guard flag prevents re-entrant sync |
