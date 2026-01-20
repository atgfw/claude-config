# Spec: n8n Node Documentation

## ADDED Requirements

### Requirement: Mandatory Node Notes (D1)

The system SHALL require substantial, meaningful notes on ALL n8n nodes.

**Note requirements:**
- Minimum 20 characters
- Must describe the node's purpose, not just repeat the node name
- No placeholder text (e.g., "TODO", "FIXME", "Add description")

#### Scenario: Block node without note
- **GIVEN** a node creation/update with empty or missing `notes` field
- **WHEN** node documentation validator executes
- **THEN** operation is BLOCKED with reason "All nodes require meaningful notes"

#### Scenario: Block shallow note
- **GIVEN** a node with note "Gets data"
- **WHEN** node documentation validator executes
- **THEN** operation is BLOCKED with reason "Note too short (20 char minimum) - describe purpose"

#### Scenario: Block placeholder note
- **GIVEN** a node with note "TODO: add description"
- **WHEN** node documentation validator executes
- **THEN** operation is BLOCKED with reason "Placeholder notes not allowed"

#### Scenario: Allow substantial note
- **GIVEN** a node with note "Fetches active jobs from ServiceTitan API for the current dispatch zone"
- **WHEN** node documentation validator executes
- **THEN** operation is ALLOWED

---

### Requirement: Display Note in Flow Enabled (D2)

The system SHALL require "Display Note in Flow?" setting enabled for all nodes.

#### Scenario: Block hidden note
- **GIVEN** a node with `notesInFlow` set to `false`
- **WHEN** node documentation validator executes
- **THEN** operation is BLOCKED with reason "Enable 'Display Note in Flow?' for visibility"

#### Scenario: Allow displayed note
- **GIVEN** a node with `notesInFlow` set to `true` and substantial note content
- **WHEN** node documentation validator executes
- **THEN** operation is ALLOWED

---

### Requirement: Note Quality Validation (D3)

The system SHALL validate that node notes are meaningful and descriptive.

**Quality checks:**
- Must not duplicate node name verbatim
- Must contain at least one verb describing the action
- Should reference data sources or targets when applicable

#### Scenario: Block name-duplicate note
- **GIVEN** a node named "HTTP Request" with note "HTTP Request"
- **WHEN** node documentation validator executes
- **THEN** operation is BLOCKED with reason "Note must describe purpose, not repeat name"

#### Scenario: Allow descriptive note
- **GIVEN** a node named "HTTP Request" with note "Posts job completion status to ServiceTitan webhook endpoint"
- **WHEN** node documentation validator executes
- **THEN** operation is ALLOWED
