# Tasks: GitHub Issue Tracking and Unified Task Synchronization

**Change ID:** `add-github-issue-tracking-system`

## Phase 1: Label Taxonomy and Conventions

- [ ] Create `github/label-taxonomy.json` with all label definitions
- [ ] Implement `label_taxonomy.ts` - provisions labels via `gh label create`
- [ ] Implement `issue_conventions.ts` - title/body validation
- [ ] Create issue body templates in `github/templates/ISSUE_TEMPLATE/`
- [ ] Write Vitest tests for title parsing and validation
- [ ] Write Vitest tests for label auto-assignment

## Phase 2: Issue CRUD Automation

- [ ] Implement `issue_crud.ts` - create/close/update automation
- [ ] Add duplicate detection (title similarity search)
- [ ] Wire auto-create to correction ledger writes
- [ ] Wire auto-create to escalation detection (severity >= high)
- [ ] Wire auto-close to task completion and OpenSpec archive
- [ ] Create `ledger/issue-sync-registry.json` schema
- [ ] Write Vitest tests for CRUD operations (mocked `gh` CLI)

## Phase 3: Unified Checklist Format

- [ ] Implement `unified_checklist.ts` - format engine
- [ ] Add renderer: GitHub issue body (acceptance criteria checkboxes)
- [ ] Add renderer: Claude Code TaskCreate description
- [ ] Add renderer: OpenSpec tasks.md markdown
- [ ] Add renderer: Claude Code plan steps
- [ ] Write Vitest tests for each renderer

## Phase 4: Task Source Sync

- [ ] Implement `task_source_sync.ts` - bidirectional sync logic
- [ ] Add sync-on-session-start (gh issue list -> local state)
- [ ] Add sync-on-task-complete (TaskUpdate -> gh issue close)
- [ ] Add sync-on-issue-close (gh issue close -> mark local complete)
- [ ] Add conflict resolution (GitHub-authoritative)
- [ ] Add re-entrancy guard to prevent circular sync
- [ ] Write Vitest tests for sync scenarios

## Phase 5: Session Start Auto-Push

- [ ] Modify `session_start.ts` - add Step 9: auto-commit/push
- [ ] Add git pull --rebase before push
- [ ] Add non-blocking failure handling (warn, don't block)
- [ ] Add sync registry pull on session start
- [ ] Write Vitest tests for session start modifications

## Phase 6: Hook Registration and Integration

- [ ] Register `issue_convention_validator` in settings.json (PreToolUse, Bash `gh issue`)
- [ ] Register `issue_auto_creator` in settings.json (PostToolUse)
- [ ] Register `task_source_sync` in settings.json (PostToolUse, TaskUpdate)
- [ ] Provision labels on first run via `label_taxonomy.ts`
- [ ] Migrate existing 13 issues to new naming/labeling convention
- [ ] Update CLAUDE.md with issue tracking documentation

## Verification

- [ ] All Vitest tests pass: `cd ~/.claude/hooks && bun test`
- [ ] Labels provisioned: `gh label list` shows taxonomy
- [ ] Existing issues relabeled: all 13 issues have `system/` and `type/` labels
- [ ] Session start auto-pushes: verify commit after session init
- [ ] Correction creates issue: add ledger entry, verify issue created
- [ ] Task completion closes issue: complete Claude task, verify issue closed
