## ADDED Requirements

### Requirement: Git Synchronization on Session Start

The session_start hook SHALL synchronize the opened project with its remote git repository when a project directory is detected.

#### Scenario: Clean working tree behind remote

- **WHEN** the working tree has no uncommitted changes
- **AND** the local branch is behind the remote
- **THEN** the system SHALL automatically pull remote changes
- **AND** log the number of commits pulled

#### Scenario: Dirty working tree with remote changes

- **WHEN** the working tree has uncommitted changes
- **AND** the remote has new commits
- **THEN** the system SHALL display a warning with:
  - List of remote commits (summary)
  - List of local uncommitted files
  - Files with potential conflicts highlighted
  - Recommended actions

#### Scenario: Already up to date

- **WHEN** the local branch is up to date with remote
- **THEN** the system SHALL log "[OK] Git: up to date" and continue

#### Scenario: Not a git repository

- **WHEN** the project directory is not a git repository
- **THEN** the system SHALL skip git synchronization and continue

#### Scenario: Network timeout

- **WHEN** git fetch times out after 30 seconds
- **THEN** the system SHALL log a warning and continue without sync

---

### Requirement: Project Cleanup on Session Start

The session_start hook SHALL clean stale files by moving them to an `old/` directory (deletion is banned).

#### Scenario: Stale temp files detected

- **WHEN** files matching cleanup patterns exist
- **AND** files are older than the configured threshold
- **THEN** the system SHALL move files to `project/old/YYYY-MM-DD/original/path/`
- **AND** log each moved file for audit trail

#### Scenario: No stale files

- **WHEN** no files match cleanup patterns
- **THEN** the system SHALL log "[OK] Cleanup: no stale files" and continue

#### Scenario: Old directory creation

- **WHEN** the `old/` directory does not exist
- **THEN** the system SHALL create it before moving files

---

### Requirement: Documentation Drift Detection

The session_start hook SHALL validate that documentation matches the current implementation.

#### Scenario: CLAUDE.md rule not enforced by hook

- **WHEN** CLAUDE.md documents a rule
- **AND** no corresponding hook enforces that rule
- **THEN** the system SHALL log a warning identifying the undocumented rule

#### Scenario: Documentation matches implementation

- **WHEN** all documented rules have corresponding hooks
- **THEN** the system SHALL log "[OK] Docs: no drift detected"

---

### Requirement: Child Project Isolation Validation

The session_start hook SHALL validate that child projects do not override the spinal cord configuration. This is a STRICT check that blocks the session on failure.

#### Scenario: Prohibited .mcp.json detected

- **WHEN** a `.mcp.json` file exists in the project root
- **THEN** the system SHALL block the session
- **AND** display error: "Child projects MUST NOT have local .mcp.json - delete it to continue"

#### Scenario: Prohibited hooks directory detected

- **WHEN** a `hooks/` directory exists in the project root
- **AND** it is not the spinal cord hooks directory
- **THEN** the system SHALL block the session
- **AND** display error: "Child projects MUST NOT have local hooks/ - delete it to continue"

#### Scenario: Prohibited settings.json detected

- **WHEN** a `settings.json` file exists in the project root
- **THEN** the system SHALL block the session
- **AND** display error: "Child projects MUST NOT have local settings.json - delete it to continue"

#### Scenario: Prohibited .env detected

- **WHEN** a `.env` file exists in the project root
- **AND** the project is not ~/.claude/
- **THEN** the system SHALL block the session
- **AND** display error: "Child projects MUST NOT have local .env - move keys to ~/.claude/.env"

#### Scenario: Clean child project

- **WHEN** no prohibited files exist
- **THEN** the system SHALL log "[OK] Governance: child project isolation verified"

---

### Requirement: Hook Compilation Validation

The session_start hook SHALL validate that all hooks are compiled and attempt self-healing on failure.

#### Scenario: Source newer than dist

- **WHEN** a TypeScript source file has a newer timestamp than its compiled output
- **THEN** the system SHALL attempt to recompile by running `bun run build`
- **AND** log the self-heal attempt

#### Scenario: Self-heal succeeds

- **WHEN** recompilation succeeds
- **THEN** the system SHALL log "[HEALED] Hooks recompiled successfully"
- **AND** continue the session

#### Scenario: Self-heal fails

- **WHEN** recompilation fails
- **THEN** the system SHALL block the session
- **AND** display the compilation error
- **AND** suggest: "Run 'cd ~/.claude/hooks && bun run build' manually to diagnose"

#### Scenario: All hooks compiled

- **WHEN** all source files have corresponding up-to-date dist files
- **THEN** the system SHALL log "[OK] Hooks: all compiled"

---

## MODIFIED Requirements

### Requirement: Session Start Hook Execution Order

The session_start hook SHALL execute validation steps in a specific order to ensure dependencies are met.

#### Scenario: Standard execution order

- **WHEN** the session starts
- **THEN** the system SHALL execute steps in this order:
  1. Load Previous Conversation Summary (existing)
  2. Child Project Isolation Validation (can block)
  3. Hook Compilation Validation (can self-heal, then block)
  4. Environment Setup (existing)
  5. Prerequisites Check (existing)
  6. Git Synchronization (new)
  7. Project Cleanup (new)
  8. MCP Server Health Check (existing)
  9. Subagent Availability (existing)
  10. API Key Sync (existing)
  11. Correction Ledger Status (existing)
  12. Escalation Status (existing)
  13. Documentation Drift Check (new, warn only)
  14. Mark Session Validated (existing)
