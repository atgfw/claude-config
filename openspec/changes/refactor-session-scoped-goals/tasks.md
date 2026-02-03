## 1. Session State Infrastructure

- [ ] 1.1 Create `hooks/src/session/goal_state.ts` with session-scoped goal storage using process.ppid
- [ ] 1.2 Define GoalStack interface with level, source, id, summary fields
- [ ] 1.3 Implement `initializeGoalState()` called from session_start hook
- [ ] 1.4 Implement `getSessionGoalState()` and `setSessionGoalState()` accessors
- [ ] 1.5 Add session ID discovery with fallback chain (env var > ppid > cwd hash)
- [ ] 1.6 Write tests for session isolation (two different ppids get different state)

## 2. Goal Stack Operations

- [ ] 2.1 Implement `pushGoal(level, source, id, summary)` to add goal to stack
- [ ] 2.2 Implement `popGoal(id)` to remove specific goal when task completes
- [ ] 2.3 Implement `getGoalHierarchy()` to return formatted goal display
- [ ] 2.4 Implement `getCurrentFocus()` to return deepest goal in stack
- [ ] 2.5 Add stack depth limit (max 4 levels)
- [ ] 2.6 Write tests for push/pop/hierarchy operations

## 3. Refactor goal_injector.ts

- [ ] 3.1 Import session goal state module
- [ ] 3.2 Modify `formatGoalContext()` to read from session state first, then fallback to active-goal.json
- [ ] 3.3 Update `goalInjector` (UserPromptSubmit) to use new hierarchical format
- [ ] 3.4 Update `goalInjectorPostToolUse` to re-inject from session state
- [ ] 3.5 Update `goalInjectorSessionStart` to initialize session state
- [ ] 3.6 Add explicit goal override detection from active-goal.json
- [ ] 3.7 Update tests for new behavior

## 4. TaskUpdate Goal Integration

- [ ] 4.1 Create `hooks/src/hooks/task_goal_sync.ts` hook for TaskUpdate events
- [ ] 4.2 Detect `status: "in_progress"` and push task to goal stack
- [ ] 4.3 Detect `status: "completed"` and pop task from goal stack
- [ ] 4.4 Extract goal fields (who/what/why) from task description if available
- [ ] 4.5 Register hook in settings.json for TaskUpdate PreToolUse
- [ ] 4.6 Write tests for task-to-goal synchronization

## 5. GitHub Issue Goal Linkage

- [ ] 5.1 Extend `issue_kanban.ts` to expose issue context for goal system
- [ ] 5.2 Implement `detectIssueContext()` to find associated issue from cwd or prompt
- [ ] 5.3 Add issue-to-goal linking when issue detected
- [ ] 5.4 Integrate with session_start to auto-detect issue context
- [ ] 5.5 Write tests for issue detection and linking

## 6. Goal Display Format

- [ ] 6.1 Create `formatGoalHierarchy()` function with new multi-level format
- [ ] 6.2 Include level labels (EPIC, ISSUE, TASK, SUBTASK)
- [ ] 6.3 Highlight current focus with visual indicator
- [ ] 6.4 Include 5W1H fields for the focused goal
- [ ] 6.5 Handle empty goal stack with "NO GOAL SET" message
- [ ] 6.6 Write tests for all display scenarios

## 7. Integration Testing

- [ ] 7.1 Test full flow: session start > task in_progress > goal appears
- [ ] 7.2 Test full flow: task completed > goal pops > parent visible
- [ ] 7.3 Test explicit goal override takes priority
- [ ] 7.4 Test session isolation with multiple concurrent sessions (mock)
- [ ] 7.5 Test backward compatibility with existing active-goal.json workflows

## 8. Documentation and Migration

- [ ] 8.1 Update CLAUDE.md "Active Goal Display" section with new behavior
- [ ] 8.2 Document goal hierarchy format
- [ ] 8.3 Add migration notes for users relying on global active-goal.json
- [ ] 8.4 Update hook implementation table in CLAUDE.md

## 9. Validation

- [ ] 9.1 Run `npm test` for all new tests
- [ ] 9.2 Run `npm run lint` to ensure code quality
- [ ] 9.3 Manual testing: start session, create task, verify goal injection
- [ ] 9.4 Manual testing: complete task, verify goal pops
