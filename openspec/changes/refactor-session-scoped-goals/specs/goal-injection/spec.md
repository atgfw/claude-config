## ADDED Requirements

### Requirement: Session-Scoped Goal Isolation
The goal injection system SHALL maintain goal state scoped to the current Claude Code session, preventing goal contamination across sessions or projects.

#### Scenario: New session starts clean
- **WHEN** a new Claude Code session starts
- **AND** a previous session had an active goal
- **THEN** the new session SHALL NOT inherit the previous goal
- **AND** the goal stack SHALL be empty

#### Scenario: Session goal persists within session
- **WHEN** a goal is set during a session
- **AND** context summarization occurs
- **THEN** the goal SHALL remain visible in subsequent turns

### Requirement: Hierarchical Goal Stack
The goal system SHALL maintain a stack of goals representing the work hierarchy: epic > issue > task > subtask.

#### Scenario: Goal hierarchy displayed
- **WHEN** goal context is injected
- **AND** multiple goal levels exist (issue + task)
- **THEN** all levels SHALL be displayed in hierarchy order
- **AND** the current focus (deepest level) SHALL be highlighted

#### Scenario: Task completion pops stack
- **WHEN** TaskUpdate sets status to "completed"
- **AND** that task was on the goal stack
- **THEN** the task SHALL be removed from the stack
- **AND** the parent goal (if any) SHALL become the focus

### Requirement: Task-Derived Goal Auto-Population
The goal system SHALL automatically derive goals from TaskUpdate operations when tasks are marked in_progress.

#### Scenario: TaskUpdate in_progress sets goal
- **WHEN** TaskUpdate sets status to "in_progress"
- **THEN** the task subject SHALL be pushed onto the goal stack
- **AND** the task description SHALL populate goal fields (who/what/why)

#### Scenario: Explicit goal overrides task-derived goal
- **WHEN** an explicit goal is set via active-goal.json
- **AND** a task is marked in_progress
- **THEN** the explicit goal SHALL take priority for display
- **AND** the task SHALL still appear in the hierarchy below it

### Requirement: GitHub Issue Goal Linkage
The goal system SHALL link GitHub issues to the goal hierarchy when the session involves issue-related work.

#### Scenario: Issue context detected
- **WHEN** session starts in a directory with an associated GitHub issue
- **OR** user references issue number in prompt
- **THEN** the issue title SHALL be added to goal stack at "issue" level

#### Scenario: Kanban issue becomes goal
- **WHEN** user selects an issue from the kanban board to work on
- **THEN** the issue SHALL automatically become the parent goal

### Requirement: Goal Injection on All Hook Events
The goal hierarchy SHALL be injected into additionalContext for all relevant hook events.

#### Scenario: UserPromptSubmit injects goal
- **WHEN** user submits a prompt
- **THEN** the full goal hierarchy SHALL be injected via additionalContext

#### Scenario: PostToolUse re-injects goal
- **WHEN** a tool completes execution
- **THEN** the goal hierarchy SHALL be re-injected
- **AND** this ensures goal survives context summarization

#### Scenario: SessionStart initializes goal context
- **WHEN** session starts
- **THEN** goal stack SHALL be initialized (empty or from context detection)
- **AND** any project-specific context SHALL be loaded

### Requirement: Backward Compatible Explicit Goals
The system SHALL maintain backward compatibility with the existing active-goal.json explicit goal mechanism.

#### Scenario: Explicit goal file takes priority
- **WHEN** active-goal.json contains a non-null goal
- **AND** session has task-derived goals
- **THEN** the explicit goal SHALL be displayed as the top-level goal

#### Scenario: Empty explicit goal uses task-derived
- **WHEN** active-goal.json has goal: null
- **THEN** the system SHALL fall back to task-derived goals
- **OR** prompt user to set a goal if none available
