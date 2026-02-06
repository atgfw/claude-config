## 1. Registry Schema Extension

- [ ] 1.1 Add `checklist_items: ChecklistItem[]` field to SyncEntry interface
- [ ] 1.2 Add `checklist_hash: string` field for drift detection
- [ ] 1.3 Add `plan_file: string | null` field for plan linkage
- [ ] 1.4 Add `sync_sources: SyncSource[]` field for per-artifact tracking
- [ ] 1.5 Create ChecklistItem interface with id, text, status, last_modified, modified_by
- [ ] 1.6 Create SyncSource interface with type, artifact_id, last_read, content_hash
- [ ] 1.7 Update loadRegistry/saveRegistry to handle new schema
- [ ] 1.8 Write migration logic for existing registry entries

## 2. Checklist Hash and ID Generation

- [ ] 2.1 Create `computeChecklistHash(items)` function
- [ ] 2.2 Create `generateItemId(text)` function using text hash
- [ ] 2.3 Create `normalizeItemText(text)` to strip formatting differences
- [ ] 2.4 Write tests for hash stability across formats

## 3. Artifact Parsers

- [ ] 3.1 Create `parseGitHubChecklist(body)` to extract items from issue body
- [ ] 3.2 Create `parseOpenSpecTasks(content)` to extract items from tasks.md
- [ ] 3.3 Create `parsePlanChecklist(content)` to extract items from plan files
- [ ] 3.4 Create `parseClaudeTasks(tasks)` to convert TaskList output
- [ ] 3.5 Write tests for each parser with edge cases

## 4. Artifact Renderers

- [ ] 4.1 Create `renderToGitHubChecklist(items)` preserving issue structure
- [ ] 4.2 Create `renderToOpenSpecTasks(items)` preserving section structure
- [ ] 4.3 Create `renderToPlanChecklist(items)` preserving plan structure
- [ ] 4.4 Create `renderToClaudeTasks(items)` for TaskCreate parameters
- [ ] 4.5 Write tests for round-trip parsing and rendering

## 5. Core Reconciliation Engine

- [ ] 5.1 Create `hooks/src/sync/checklist_reconciler.ts` module
- [ ] 5.2 Implement `reconcileArtifact(artifactType, content)` main entry
- [ ] 5.3 Implement `detectDrift(entry, artifactType, content)` hash comparison
- [ ] 5.4 Implement `compareItems(registryItems, artifactItems)` item-level diff
- [ ] 5.5 Implement `resolveConflicts(conflicts)` newest-wins logic
- [ ] 5.6 Implement `updateRegistry(entry, reconciledItems)` save changes
- [ ] 5.7 Write comprehensive tests for reconciliation scenarios

## 6. Propagation Engine

- [ ] 6.1 Implement `propagateToGitHub(entry)` update issue body
- [ ] 6.2 Implement `propagateToOpenSpec(entry)` update tasks.md
- [ ] 6.3 Implement `propagateToPlan(entry)` update plan file
- [ ] 6.4 Implement `propagateToClaudeTasks(entry)` (note: limited by TaskUpdate API)
- [ ] 6.5 Add error handling and retry logic for propagation
- [ ] 6.6 Write tests for propagation scenarios

## 7. Hook Integration - Read Operations

- [ ] 7.1 Create `checklist_read_reconciler.ts` hook for Read tool
- [ ] 7.2 Add matcher for `tasks.md` file patterns
- [ ] 7.3 Add matcher for `plans/*.md` file patterns
- [ ] 7.4 Trigger reconciliation in PostToolUse for matched reads
- [ ] 7.5 Register hooks in settings.json
- [ ] 7.6 Write integration tests

## 8. Hook Integration - Write Operations

- [ ] 8.1 Create `checklist_write_propagator.ts` hook for Write/Edit tools
- [ ] 8.2 Add matcher for `tasks.md` file patterns
- [ ] 8.3 Add matcher for `plans/*.md` file patterns
- [ ] 8.4 Trigger propagation in PostToolUse for matched writes
- [ ] 8.5 Register hooks in settings.json
- [ ] 8.6 Write integration tests

## 9. Hook Integration - Task Operations

- [ ] 9.1 Extend `task_goal_sync.ts` to call reconciliation on TaskUpdate
- [ ] 9.2 Add registry update when TaskUpdate changes status
- [ ] 9.3 Trigger propagation to linked artifacts on task completion
- [ ] 9.4 Handle TaskCreate by linking new tasks to registry
- [ ] 9.5 Write tests for task-triggered reconciliation

## 10. Session Start Integration

- [ ] 10.1 Add drift detection step to session_start.ts
- [ ] 10.2 Report drifted artifacts in session start output
- [ ] 10.3 Auto-reconcile drifted artifacts on session start
- [ ] 10.4 Update kanban board to reflect reconciled state
- [ ] 10.5 Write tests for session start integration

## 11. Artifact Linking

- [ ] 11.1 Create `linkArtifacts(issueNumber, openspecId, planFile)` helper
- [ ] 11.2 Add auto-detection of linked artifacts from file paths
- [ ] 11.3 Add auto-detection of linked issue from branch name
- [ ] 11.4 Create `findLinkedArtifacts(entry)` to discover linkages
- [ ] 11.5 Write tests for artifact linking

## 12. Index and Export Updates

- [ ] 12.1 Add new modules to hooks/src/index.ts exports
- [ ] 12.2 Register all new hooks in CLI
- [ ] 12.3 Update settings.json with all new hook matchers
- [ ] 12.4 Document new capabilities in hooks/docs/ (CLAUDE.md slimmed to governance index)

## 13. Validation and Testing

- [ ] 13.1 Run `bun test` for all new tests
- [ ] 13.2 Run `bun run lint` to ensure code quality
- [ ] 13.3 Manual test: create issue, create tasks, verify sync
- [ ] 13.4 Manual test: update tasks.md, verify propagation
- [ ] 13.5 Manual test: complete task, verify issue checkbox updated
- [ ] 13.6 Run `openspec validate add-checklist-reconciliation --strict`
