# Design: Session-Scoped Hierarchical Goals

## Context

Claude Code sessions are ephemeral but the current goal system uses a persistent global file. When a user starts a new session to work on a different task, they inherit the stale goal from the previous session. This creates confusion and dilutes focus.

**Stakeholders:**
- Claude Code users who work on multiple projects/issues
- Hooks that inject goal context into every turn
- GitHub issue tracking system
- Task checklist system (TaskCreate/TaskUpdate/TaskList)

## Goals / Non-Goals

### Goals
- Session isolation: Each session has independent goal context
- Hierarchical visibility: See parent (issue), current (task), and child (subtask) goals
- Auto-population: Goals derive from active work items (TaskUpdate status=in_progress)
- Persistence within session: Goal survives context summarization
- Manual override: User can still set explicit goals

### Non-Goals
- Cross-session goal persistence (explicitly removing this)
- Goal history/analytics beyond current session
- Multi-user goal coordination

## Architecture

### Data Model

```
Session Goal State (per-session, not persisted to disk):
{
  "session_id": "uuid",
  "started_at": "ISO timestamp",
  "goal_stack": [
    {
      "level": "epic",
      "source": "github_milestone",
      "id": "milestone-3",
      "summary": "Q1 Automation Platform"
    },
    {
      "level": "issue",
      "source": "github_issue",
      "id": "29",
      "summary": "Never fabricate versioning systems"
    },
    {
      "level": "task",
      "source": "task_tool",
      "id": "task-1",
      "summary": "Implement version_fabrication_detector hook"
    }
  ],
  "explicit_goal": null | { "summary": "...", "fields": {...} },
  "derived_from_task": "task-1" | null
}
```

### Goal Resolution Priority

1. **Explicit goal** - User manually set via goal file edit (highest priority)
2. **Active task** - TaskUpdate with status=in_progress
3. **GitHub issue context** - If working in a directory associated with an issue
4. **Fallback** - Prompt user to define goal

### Hook Integration

| Hook Event | Goal Behavior |
|------------|---------------|
| SessionStart | Initialize empty goal stack, detect project context |
| UserPromptSubmit | Inject full goal hierarchy into additionalContext |
| PostToolUse | Re-inject goal (context may have summarized) |
| TaskUpdate (in_progress) | Push task onto goal stack |
| TaskUpdate (completed) | Pop task from goal stack |

### Session Storage Options

**Option A: Environment variable (selected)**
- Store serialized goal state in `CLAUDE_SESSION_GOAL`
- Hooks read/write via env
- Pros: True session isolation, no file conflicts
- Cons: Size limits, not human-readable

**Option B: Session-specific file**
- Store in `ledger/sessions/<session-id>/goal.json`
- Pros: Human-readable, debuggable
- Cons: Requires session ID discovery, cleanup needed

**Option C: In-memory via hook process**
- Not viable - hooks are stateless processes

**Decision: Option A (env var) for goal stack, with Option B fallback for explicit goals**

The env var provides true isolation. The file fallback allows users to manually set goals that persist across hook invocations within the session.

### Session ID Discovery

Claude Code provides session context via:
1. `process.ppid` - Parent process ID (stable within session)
2. `CLAUDE_SESSION_ID` env var (if available)
3. Hash of `cwd + timestamp` as fallback

### Goal Display Format

```
---
**GOAL HIERARCHY:**
- **EPIC:** Q1 Automation Platform (milestone-3)
- **ISSUE:** #29 Never fabricate versioning systems
- **TASK:** Implement version_fabrication_detector hook [in_progress]

**FOCUS:** Implement version_fabrication_detector hook
- **WHO:** Claude Code hooks system
- **WHAT:** Block Write/Edit that introduces version patterns where none existed
- **WHY:** Prevent fabricated versioning across all projects
```

## Decisions

### Decision 1: Session isolation via process-scoped state
Use `process.ppid` (parent PID) as session identifier. All hooks within a Claude Code session share the same parent process.

**Alternatives considered:**
- Global file with timestamps (current) - Rejected: causes cross-session pollution
- Database storage - Rejected: overkill for single-user CLI

### Decision 2: Automatic goal derivation from TaskUpdate
When `TaskUpdate` sets `status: "in_progress"`, automatically push that task's subject/description onto the goal stack.

**Alternatives considered:**
- Require explicit goal setting - Rejected: adds friction
- Only use GitHub issues - Rejected: not all work has issues

### Decision 3: Keep backward compatibility with active-goal.json
The global file becomes the "explicit goal override" - if populated, it takes priority. This allows users to manually set goals when needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Env var size limits | Compress or truncate goal stack if >4KB |
| Session ID instability | Fallback chain: env var > ppid > cwd hash |
| Lost goals on crash | Accept: goals are ephemeral by design |
| Complexity increase | Phased rollout, maintain simple fallback |

## Migration Plan

1. **Phase 1:** Add session-scoped storage alongside global file
2. **Phase 2:** Update goal_injector to prefer session state
3. **Phase 3:** Integrate TaskUpdate hooks to auto-populate goals
4. **Phase 4:** Deprecate global file as primary source (keep as override)

**Rollback:** Revert to reading global file only

## Open Questions

1. Should completed tasks remain visible in goal hierarchy (grayed out)?
2. How deep should the goal stack go? (Recommend: max 4 levels)
3. Should goals auto-clear when session ends, or persist for session resume?
