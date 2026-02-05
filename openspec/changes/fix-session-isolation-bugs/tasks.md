# Tasks: Fix Session Isolation and Goal Management Bugs

## Phase 1: Critical Path Matching Fix

- [ ] 1.1 Add `isPathMatch()` function to `hooks/src/utils.ts`
- [ ] 1.2 Add unit tests for `isPathMatch()` covering sibling directories, parent-child, Windows paths
- [ ] 1.3 Replace `includes()` check in `session_hydrator.ts:67` with `isPathMatch()`
- [ ] 1.4 Verify existing session_hydrator tests pass

## Phase 2: Critical projectScope Race Condition Fix

- [ ] 2.1 Import `isPathMatch` into `goal_stack.ts`
- [ ] 2.2 Add conditional guard to `syncGoalToActiveGoalJson()` at line 269
- [ ] 2.3 Add unit test for projectScope race condition scenario
- [ ] 2.4 Verify existing goal_stack tests pass

## Phase 3: Critical Repository Context Addition

- [ ] 3.1 Add `github_repo: string | null` to `SyncEntry` interface
- [ ] 3.2 Add `getCurrentRepo()` helper function
- [ ] 3.3 Update entry creation to include repo context
- [ ] 3.4 Add migration logic in `loadRegistry()` for existing entries
- [ ] 3.5 Update `linkedArtifacts` in goal_stack.ts to store repo with issue
- [ ] 3.6 Add unit tests for repository context tracking

## Phase 4: Medium Session Cleanup

- [ ] 4.1 Add `cleanupStaleSessions()` function to `goal_stack.ts`
- [ ] 4.2 Add throttle mechanism (flag file, once per day)
- [ ] 4.3 Invoke from `session_hydrator.ts` at session start
- [ ] 4.4 Add unit tests for cleanup mechanism

## Phase 5: Medium Working Directory Drift

- [ ] 5.1 Add cwd drift detection to `loadGoalStack()`
- [ ] 5.2 Auto-save when drift detected
- [ ] 5.3 Add unit test for drift detection

## Phase 6: Validation

- [ ] 6.1 Run full test suite: `cd ~/.claude/hooks && bun test`
- [ ] 6.2 Manual test: Sessions in sibling directories don't leak goals
- [ ] 6.3 Manual test: Same issue from two projects doesn't flip projectScope
- [ ] 6.4 Verify lint passes: `cd ~/.claude/hooks && bun run lint`

## Dependencies

```
1.1 -> 1.2 -> 1.3 -> 1.4
       1.1 -> 2.1 -> 2.2 -> 2.3 -> 2.4
3.1 -> 3.2 -> 3.3 -> 3.4 -> 3.5 -> 3.6
4.1 -> 4.2 -> 4.3 -> 4.4
5.1 -> 5.2 -> 5.3
All phases -> 6.1 -> 6.2 -> 6.3 -> 6.4
```

## Parallelizable Work

- Phase 1 and Phase 3 can run in parallel (no dependencies)
- Phase 4 and Phase 5 can run in parallel (no dependencies)
- Phase 2 depends on Phase 1 (needs `isPathMatch`)
