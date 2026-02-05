# Change: Fix Session Isolation and Goal Management Bugs

## Why

The goal injection and task management system has critical bugs causing:

1. **Goal leakage between sibling projects** - Path comparison uses `String.includes()` which matches `/projects/myapp` to `/projects/myapp2`
2. **projectScope race condition** - Two sessions on same GitHub issue flip ownership back and forth
3. **Cross-repository issue collisions** - Issue #123 in repo-A indistinguishable from #123 in repo-B
4. **Session directory accumulation** - 107+ stale sessions with no cleanup
5. **Working directory staleness** - Set at session start, never updated

## What Changes

### Critical Fixes

1. **Replace `includes()` with proper path matching** - Use `path.resolve()` + separator-aware comparison
2. **Guard projectScope updates** - Only update if not already set by different project
3. **Add repository context to GitHub issues** - Store `owner/repo` with issue numbers

### Medium Fixes

4. **Session cleanup mechanism** - Archive sessions older than 7 days
5. **Working directory drift detection** - Update on every goal stack load

### NOT Changing

- Session-scoped architecture remains (no global goal fallback)
- Goal compliance gate severity unchanged
- Existing OpenSpec proposals (`refactor-session-scoped-goals`, `improve-goal-auto-derivation`) remain valid for future comprehensive refactoring

## Impact

- Affected code:
  - `hooks/src/hooks/session_hydrator.ts` - Path matching logic
  - `hooks/src/session/goal_stack.ts` - projectScope guard, cleanup, cwd drift
  - `hooks/src/github/task_source_sync.ts` - Repository context
  - `hooks/src/utils.ts` - Shared path utility

- Affected registries:
  - `ledger/issue-sync-registry.json` - Add `github_repo` field (migration on load)

## Relationship to Existing Proposals

This is a **surgical fix** addressing the most critical bugs immediately. The existing proposals provide more comprehensive refactoring:

| Proposal | Status | Relationship |
|----------|--------|--------------|
| `refactor-session-scoped-goals` | 0/49 tasks | Full redesign - this fix is compatible |
| `improve-goal-auto-derivation` | 0/23 tasks | Field extraction - orthogonal to this fix |
