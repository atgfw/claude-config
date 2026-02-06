# Tasks: Fix GitHub Issue & Autocommit Lifecycle Wiring

**Change ID:** `fix-lifecycle-wiring`

## Phase 1: Wire Dead Code

- [x] Wire `escalation_trigger.ts` to call `createFromEscalation()` on pattern threshold
- [x] Wire `proposal_generator.ts` to call `createFromOpenSpec()` and `linkOpenSpec()`
- [x] Create `openspec_issue_bridge.ts` PostToolUse hook for manual proposal creation
- [x] Wire `task_completion_gate.ts` to call `onTaskComplete()` on task completion
- [x] Wire `task_goal_sync.ts` to call `linkTask()` when task linked to issue
- [x] Wire `session_start.ts` to use `syncFromGitHub()` instead of duplicated logic

## Phase 2: Auto-Commit Fix

- [x] Add throttled auto-commit (5-minute interval) to `unified_post_tool.ts`
- [x] File-based timestamp for cross-process persistence

## Phase 3: Quality Check Fix

- [x] Downgrade TS6133 (unused import/variable) from ERROR to WARNING in TypeScript checks
- [x] Downgrade `@typescript-eslint/no-unused-vars` from ERROR to WARNING in XO checks

## Phase 4: Registration

- [x] Register `openspec_issue_bridge` in `settings.json` (PostToolUse, Write|Edit)
- [x] Register `openspec_issue_bridge` in `index.ts` (import and export)

## Phase 5: Build and Verify

- [ ] Build hooks: `cd ~/.claude/hooks && bun run build`
- [ ] Run tests: `cd ~/.claude/hooks && bun test`
- [ ] Verify compilation succeeds
