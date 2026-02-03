## ADDED Requirements

### Requirement: Unified Checklist Registry
The system SHALL maintain a unified registry of checklist items that links all 4 artifact types (Claude Tasks, GitHub Issues, OpenSpec tasks.md, Plan files).

#### Scenario: Registry tracks linked artifacts
- **WHEN** a checklist item exists in multiple artifacts
- **THEN** the registry SHALL store the item once with linkages to all artifacts
- **AND** the registry SHALL track the last sync time for each artifact

#### Scenario: New item added to any artifact
- **WHEN** a new checklist item is added to any linked artifact
- **THEN** the item SHALL be added to the registry
- **AND** the item SHALL be assigned a stable ID based on its text hash

### Requirement: Read-Triggered Reconciliation
The system SHALL reconcile checklist state when any linked artifact is read.

#### Scenario: Read detects drift
- **WHEN** a checklist artifact (tasks.md, plan file) is read via Read tool
- **AND** the artifact's content hash differs from the last synced hash
- **THEN** the system SHALL compare item-by-item against the registry
- **AND** update the registry with any changes

#### Scenario: TaskList triggers reconciliation
- **WHEN** TaskList is invoked
- **THEN** the system SHALL reconcile Claude Tasks against the registry
- **AND** return the reconciled task list

### Requirement: Write-Triggered Propagation
The system SHALL propagate checklist changes to all linked artifacts when any artifact is updated.

#### Scenario: TaskUpdate propagates to GitHub
- **WHEN** TaskUpdate changes a task status to completed
- **AND** the task is linked to a GitHub issue
- **THEN** the system SHALL update the checkbox in the GitHub issue body
- **AND** close the issue if all checklist items are completed

#### Scenario: Write to tasks.md propagates to plan
- **WHEN** Write tool updates an OpenSpec tasks.md file
- **AND** the change modifies checklist items
- **AND** a plan file is linked to the same work
- **THEN** the system SHALL update the plan file's checklist

#### Scenario: Write to plan propagates to tasks.md
- **WHEN** Write tool updates a plan file's checklist
- **AND** an OpenSpec tasks.md is linked to the same work
- **THEN** the system SHALL update the OpenSpec tasks.md

### Requirement: Verbatim Text Synchronization
The system SHALL synchronize checklist item text VERBATIM across all artifacts.

#### Scenario: Exact text match required
- **WHEN** syncing a checklist item between artifacts
- **THEN** the item text SHALL be identical character-for-character
- **AND** only formatting differences (checkboxes, numbering) SHALL vary by artifact type

#### Scenario: Text change creates new item
- **WHEN** an item's text is modified in any artifact
- **THEN** the system SHALL treat it as a NEW item
- **AND** the old item SHALL be marked as potentially deleted

### Requirement: Drift Detection and Reporting
The system SHALL detect and report when artifacts have drifted from the registry.

#### Scenario: Drift detected on read
- **WHEN** an artifact's content hash differs from the stored hash
- **THEN** the system SHALL log a drift warning
- **AND** include the number of items that differ

#### Scenario: Drift report in session start
- **WHEN** a session starts
- **AND** linked artifacts have drifted
- **THEN** the session start hook SHALL report the drift
- **AND** automatically reconcile if possible

### Requirement: Conflict Resolution
The system SHALL resolve conflicts using newest-wins semantics.

#### Scenario: Same item different status
- **WHEN** the same item has status "completed" in artifact A
- **AND** status "pending" in artifact B
- **THEN** the system SHALL use the status with the most recent modification time
- **AND** propagate that status to both artifacts

#### Scenario: Item exists in one artifact only
- **WHEN** an item exists in the registry but not in an artifact
- **THEN** the system SHALL ADD the item to the artifact
- **UNLESS** the item was explicitly deleted (marked in registry)

### Requirement: Artifact Format Preservation
The system SHALL preserve each artifact's native format when syncing.

#### Scenario: GitHub issue format
- **WHEN** syncing to a GitHub issue body
- **THEN** items SHALL be formatted as `- [ ]` or `- [x]` markdown
- **AND** existing issue body structure SHALL be preserved

#### Scenario: OpenSpec tasks.md format
- **WHEN** syncing to an OpenSpec tasks.md
- **THEN** items SHALL be formatted with section headers and numbered items
- **AND** existing section structure SHALL be preserved

#### Scenario: Plan file format
- **WHEN** syncing to a plan file
- **THEN** items SHALL be formatted as markdown checklists
- **AND** existing plan structure (headings, prose) SHALL be preserved
