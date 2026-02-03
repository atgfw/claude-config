# Change: Add Bidirectional Checklist Reconciliation

## Why

Task checklists exist across 4 artifact types that inevitably drift out of sync:

1. **Claude Code Tasks** - TaskCreate/TaskUpdate/TaskList in-memory
2. **GitHub Issues** - Checklist markdown in issue bodies
3. **OpenSpec tasks.md** - Checklist in `openspec/changes/<id>/tasks.md`
4. **Plan files** - Checklists in `~/.claude/plans/*.md`

When a task is marked complete in one system, the others don't know. This causes:
- Tasks completed in Claude marked incomplete in GitHub
- OpenSpec tasks.md shows 0/35 but plan shows work done
- Human confusion about actual progress
- Wasted effort re-doing work or verifying state

## What Changes

- **Unified checklist registry** - Single source of truth linking all 4 artifact types
- **Read triggers reconciliation** - When any checklist artifact is read, compare against registry
- **Write triggers propagation** - When any checklist is updated, sync to linked artifacts
- **Hash-based drift detection** - Detect when artifacts diverge from last known sync
- **Verbatim sync** - Task text synced EXACTLY across all formats

### **BREAKING**
- Existing `SyncEntry` schema will gain new fields for checklist hashes
- `unified_checklist.ts` will become the authoritative reconciliation engine

## Impact

- Affected specs: `checklist-sync` (new capability)
- Affected code:
  - `hooks/src/github/unified_checklist.ts` - Become reconciliation engine
  - `hooks/src/github/task_source_sync.ts` - Extend with hash tracking
  - `hooks/src/hooks/task_goal_sync.ts` - Trigger reconciliation on task ops
  - `settings.json` - Add hooks for Read operations on plan/tasks.md files
  - New: `hooks/src/sync/checklist_reconciler.ts` - Core reconciliation logic
