# Change: Refactor Goal Injection to Session-Scoped Hierarchical System

## Why

The current goal injection system uses a **global** `active-goal.json` file that persists across all Claude Code sessions and projects. This causes:

1. **Stale goal contamination** - Goals from previous sessions bleed into unrelated work
2. **Cross-project pollution** - A goal set in Project A appears in Project B
3. **No task-level granularity** - Goals don't reflect the current checklist item being worked on
4. **Missing hierarchy** - No visibility into parent goals (issue/epic) or child goals (subtasks)

## What Changes

- **Session-scoped goal storage** - Each session gets its own goal context, not a global file
- **Hierarchical goal display** - Show parent goal (GitHub issue) AND current task goal simultaneously
- **Task-derived goals** - Goals auto-populate from the current in_progress TaskUpdate item
- **Issue-linked goals** - When working on a GitHub issue, the issue becomes the parent goal
- **Goal inheritance chain** - Display: Epic > Issue > Task > Subtask

### **BREAKING**
- `active-goal.json` will no longer be the sole source of truth
- Goal injection hooks will read from session state, not global file

## Impact

- Affected specs: `goal-injection` (new capability)
- Affected code:
  - `hooks/src/hooks/goal_injector.ts` - Major refactor
  - `ledger/active-goal.json` - Replaced by session-specific storage
  - `hooks/src/hooks/session_start.ts` - Initialize session goal context
  - `hooks/src/github/issue_kanban.ts` - Link issues to goals
  - Task tools integration (TaskCreate, TaskUpdate, TaskList)
