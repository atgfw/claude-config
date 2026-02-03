# Design: Bidirectional Checklist Reconciliation

## Context

Claude Code sessions operate with multiple checklist artifacts that represent the same work:
- **Claude Tasks** - Ephemeral in-memory, lost on session end
- **GitHub Issues** - Persistent, human-readable, but requires API calls
- **OpenSpec tasks.md** - File-based, version-controlled, change-scoped
- **Plan files** - File-based, session-specific planning documents

**Stakeholders:**
- Claude Code users who track tasks across systems
- Hooks that intercept checklist operations
- GitHub issue tracking integration
- OpenSpec change workflow

## Goals / Non-Goals

### Goals
- **Verbatim sync** - Task text identical across all linked artifacts
- **Bidirectional** - Changes in ANY system propagate to ALL linked systems
- **Drift detection** - Identify when artifacts have diverged
- **Automatic reconciliation** - On read/write, sync without user action
- **Audit trail** - Record what synced when

### Non-Goals
- Cross-project sync (each project has independent checklist state)
- Conflict resolution UI (auto-resolve with newest-wins)
- Real-time sync (event-driven, not polling)
- Merge of non-identical tasks (only exact matches sync)

## Architecture

### Data Model

**Extended SyncEntry:**
```typescript
interface SyncEntry {
  unified_id: string;

  // Artifact linkages
  github_issue: number | null;
  claude_task_id: string | null;
  openspec_change_id: string | null;
  plan_file: string | null;  // NEW: path to plan file

  // Checklist state
  checklist_items: ChecklistItem[];  // NEW: verbatim items
  checklist_hash: string;  // NEW: hash of items for drift detection

  // Sync metadata
  status: 'open' | 'closed';
  last_synced: string;
  sync_sources: SyncSource[];  // NEW: which artifacts participated
}

interface ChecklistItem {
  id: string;  // Stable ID across syncs
  text: string;  // Verbatim task text
  status: 'pending' | 'in_progress' | 'completed';
  last_modified: string;
  modified_by: 'claude_task' | 'github_issue' | 'openspec' | 'plan';
}

interface SyncSource {
  type: 'github_issue' | 'claude_task' | 'openspec' | 'plan';
  artifact_id: string;
  last_read: string;
  content_hash: string;
}
```

### Reconciliation Algorithm

```
1. ON_READ(artifact):
   - Load artifact content
   - Compute content_hash
   - Find SyncEntry by artifact linkage
   - IF content_hash != sync_sources[artifact].content_hash:
     - DRIFT DETECTED
     - Compare item-by-item:
       - Items with same text: sync status (newest wins)
       - Items only in artifact: ADD to registry
       - Items only in registry: CHECK if deleted or missing
     - Update all linked artifacts with reconciled state

2. ON_WRITE(artifact, new_content):
   - Compute new_content_hash
   - Update SyncEntry.checklist_items from new_content
   - Update SyncEntry.checklist_hash
   - FOR EACH linked artifact:
     - Convert checklist_items to artifact format
     - Write to artifact
     - Update sync_sources[artifact].content_hash
```

### Content Hash Computation

```typescript
function computeChecklistHash(items: ChecklistItem[]): string {
  // Sort by ID for stability, hash text + status
  const normalized = items
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(i => `${i.text}:${i.status}`)
    .join('\n');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

### Hook Integration

| Hook Event | Artifact | Action |
|------------|----------|--------|
| `PreToolUse(TaskList)` | Claude Tasks | Reconcile before listing |
| `PostToolUse(TaskUpdate)` | Claude Tasks | Propagate status change |
| `PreToolUse(Read)` on `tasks.md` | OpenSpec | Reconcile before reading |
| `PostToolUse(Write)` on `tasks.md` | OpenSpec | Propagate changes |
| `PreToolUse(Read)` on `plans/*.md` | Plans | Reconcile before reading |
| `PostToolUse(Write)` on `plans/*.md` | Plans | Propagate changes |
| `SessionStart` | GitHub Issues | Sync from GitHub API |

### Artifact Format Converters

**To/From GitHub Issue Body:**
```markdown
## Checklist
- [ ] Task one
- [x] Task two completed
- [ ] Task three
```

**To/From OpenSpec tasks.md:**
```markdown
## 1. Phase Name
- [ ] 1.1 Task one
- [x] 1.2 Task two completed
- [ ] 1.3 Task three
```

**To/From Plan file:**
```markdown
## Implementation Steps
- [ ] Task one
- [x] Task two completed
- [ ] Task three
```

**To/From Claude Tasks:**
```json
[
  { "id": "1", "subject": "Task one", "status": "pending" },
  { "id": "2", "subject": "Task two completed", "status": "completed" },
  { "id": "3", "subject": "Task three", "status": "pending" }
]
```

## Decisions

### Decision 1: Registry as source of truth
The `issue-sync-registry.json` becomes the canonical checklist state. All artifacts are projections of this state.

**Alternatives considered:**
- GitHub as source of truth - Rejected: requires API calls, slow
- Latest-modified artifact wins - Rejected: race conditions

### Decision 2: Item ID stability via text hashing
Items are identified by a hash of their normalized text. This allows matching items across artifacts even when they don't have explicit IDs.

**Alternatives considered:**
- Sequential numbering - Rejected: breaks when items reordered
- UUIDs everywhere - Rejected: hard to propagate to GitHub markdown

### Decision 3: Newest-wins conflict resolution
When the same item has different statuses in different artifacts, the most recently modified wins.

**Alternatives considered:**
- Human resolution - Rejected: friction, delays work
- Priority by artifact type - Rejected: arbitrary

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits | Cache issues, batch updates |
| Large checklists slow sync | Limit to 100 items, paginate |
| File write conflicts | Use temp file + atomic rename |
| Lost updates on crash | Journal pending syncs |

## Migration Plan

1. **Phase 1:** Extend SyncEntry schema with new fields (backward compatible)
2. **Phase 2:** Add reconciliation logic, initially read-only (detect drift)
3. **Phase 3:** Enable write propagation for OpenSpec/Plans
4. **Phase 4:** Enable GitHub issue body updates

**Rollback:** Disable propagation hooks, registry becomes read-only audit log

## Open Questions

1. Should completed items be synced indefinitely or pruned after N days?
2. Should reconciliation warn on drift or silently fix?
3. How to handle deleted items - mark as deleted or remove from registry?
