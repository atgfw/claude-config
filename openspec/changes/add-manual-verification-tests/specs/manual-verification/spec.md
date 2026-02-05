# Spec Delta: Manual Verification

## Goal

Define the manual verification test framework capability for features that cannot be validated through automated unit tests alone.

## ADDED Requirements

### Requirement: Manual Test Documentation Structure

The system SHALL provide structured documentation for manual verification tests.

#### Scenario: Test document created for feature

- **WHEN** a feature requires manual verification
- **THEN** a test document SHALL be created in `docs/manual-tests/<feature-group>/`
- **AND** the document SHALL include prerequisites, setup command, test steps, expected output, and cleanup

#### Scenario: Test document follows template

- **WHEN** a manual test document is created
- **THEN** it SHALL contain all required sections: Feature Under Test, Prerequisites, Setup Command, Test Steps, Expected Output, Verification Checklist, Cleanup Command, Edge Cases

---

### Requirement: Setup Script Availability

The system SHALL provide setup scripts to create reproducible test conditions.

#### Scenario: Setup script creates test conditions

- **WHEN** a manual test requires specific preconditions
- **THEN** a TypeScript setup script SHALL be provided in `scripts/test-setup/<feature-group>/`
- **AND** the script SHALL be executable via `bun run <script>.ts`

#### Scenario: Setup scripts are cross-platform

- **WHEN** setup scripts are created
- **THEN** they SHALL use Node.js path utilities (`path.join()`) for cross-platform compatibility
- **AND** platform-specific behaviors SHALL be documented

---

### Requirement: Test Execution Tracking

The system SHALL track manual test executions in a registry.

#### Scenario: Test execution recorded

- **WHEN** a manual test is executed
- **THEN** the execution SHALL be recorded in `ledger/manual-test-registry.json`
- **AND** the record SHALL include executor, platform, timestamp, result, and notes

#### Scenario: Registry tracks multiple platforms

- **WHEN** tests are executed on different platforms
- **THEN** each execution SHALL record the platform identifier (win32, linux, darwin)
- **AND** platform-specific edge cases SHALL be documented in the notes field

---

### Requirement: Session Re-initialization Manual Tests

The system SHALL provide manual tests for each session re-initialization feature.

#### Scenario: Dirty tree detection test

- **WHEN** the git working tree has uncommitted changes
- **AND** the remote has new commits
- **THEN** the test SHALL verify a warning is displayed during session start
- **AND** the warning SHALL include commit count and affected file list

#### Scenario: Governance block test

- **WHEN** prohibited files exist in a child project (.mcp.json, hooks/, settings.json, .env)
- **THEN** the test SHALL verify the session is blocked
- **AND** an error message SHALL identify the specific violation

#### Scenario: Self-heal test

- **WHEN** hook source files are newer than compiled outputs (or dist/ is missing)
- **THEN** the test SHALL verify automatic recompilation occurs
- **AND** the self-heal action SHALL be logged with `[SELF-HEAL]` prefix

#### Scenario: Cleanup test

- **WHEN** stale temporary files exist (*.tmp, *.bak older than configured threshold)
- **THEN** the test SHALL verify files are moved to `old/YYYY-MM-DD/` directory
- **AND** archived files SHALL be logged

#### Scenario: Documentation drift test

- **WHEN** a workflow JSON filename differs from the workflow name inside the file
- **THEN** the test SHALL verify a warning is displayed
- **AND** the warning SHALL identify the mismatched names
