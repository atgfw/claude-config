# Spec Delta: Cloud Object Creation Gate

**Capability:** `cloud-object-creation-gate`
**Change ID:** `add-cloud-object-creation-gate`

## ADDED Requirements

### Requirement: Block cloud creation without PROJECT-DIRECTIVE.md

The system SHALL block any cloud object creation or update MCP tool call when no `PROJECT-DIRECTIVE.md` file exists in the working directory or any parent directory up to the filesystem root.

#### Scenario: No PROJECT-DIRECTIVE.md anywhere

- **GIVEN** the working directory is `/home/user/my-project` with no `PROJECT-DIRECTIVE.md` in any ancestor
- **WHEN** `mcp__n8n-mcp__n8n_create_workflow` is invoked
- **THEN** the hook returns `deny` with reason "Missing PROJECT-DIRECTIVE.md"

#### Scenario: PROJECT-DIRECTIVE.md exists in parent

- **GIVEN** `/home/user/PROJECT-DIRECTIVE.md` exists
- **WHEN** `mcp__n8n-mcp__n8n_create_workflow` is invoked from `/home/user/my-project`
- **THEN** the PROJECT-DIRECTIVE.md check passes

### Requirement: Block cloud creation without spec files

The system SHALL block any cloud object creation MCP tool call when no specification file exists for the entity being created.

#### Scenario: No spec for workflow

- **GIVEN** a workflow named `customer_sync` is being created
- **WHEN** no file matching `**/customer_sync*spec*` or `**/customer-sync*spec*` exists
- **THEN** the hook returns `deny` with reason "Missing spec for entity: customer_sync"

#### Scenario: Spec exists

- **GIVEN** a workflow named `customer_sync` is being created
- **WHEN** `specs/customer_sync/spec.md` exists
- **THEN** the spec check passes

### Requirement: Block cloud creation without 3 novel test runs

The system SHALL block any cloud object creation MCP tool call when `test-run-registry.json` does not contain at least 3 entries with unique SHA-256 input hashes for the entity.

#### Scenario: Zero test runs

- **GIVEN** entity `customer_sync` has no entries in test-run-registry.json
- **WHEN** `mcp__n8n-mcp__n8n_create_workflow` is invoked
- **THEN** the hook returns `deny` with reason "Primordial pipeline incomplete: 0/3 novel runs for customer_sync"

#### Scenario: 3 novel runs present

- **GIVEN** entity `customer_sync` has 3 entries with distinct `inputHash` values
- **WHEN** `mcp__n8n-mcp__n8n_create_workflow` is invoked
- **THEN** the test-run check passes

#### Scenario: 3 runs but duplicate hashes

- **GIVEN** entity `customer_sync` has 3 entries but only 2 unique `inputHash` values
- **WHEN** creation is attempted
- **THEN** the hook returns `deny` with reason "Primordial pipeline incomplete: 2/3 novel runs for customer_sync"

### Requirement: Block cloud creation without local files

The system SHALL block any cloud object creation MCP tool call when no local version-controlled file exists for the entity.

#### Scenario: No local workflow JSON

- **GIVEN** no file matching `**/customer_sync*.json` exists locally
- **WHEN** `mcp__n8n-mcp__n8n_create_workflow` for `customer_sync` is invoked
- **THEN** the hook returns `deny` with reason "No local files for entity: customer_sync"

#### Scenario: Local file exists

- **GIVEN** `workflows/customer_sync.json` exists locally
- **WHEN** creation is invoked
- **THEN** the local files check passes

### Requirement: Emergency bypass via environment variable

The system SHALL allow bypass when `CLOUD_GATE_BYPASS=1` is set, logging a warning.

#### Scenario: Bypass enabled

- **GIVEN** `CLOUD_GATE_BYPASS=1` is set in environment
- **WHEN** any cloud creation tool is invoked without meeting preconditions
- **THEN** the hook returns `allow` with warning "CLOUD_GATE_BYPASS active - skipping precondition checks"

### Requirement: Non-cloud tools pass through

The system SHALL allow any tool call that does not match the cloud object creation matcher pattern.

#### Scenario: Local file write

- **GIVEN** tool_name is `Write`
- **WHEN** the hook executes
- **THEN** the hook returns `allow` immediately

### Requirement: Matched tool patterns

The system SHALL intercept the following tool patterns: `mcp__n8n-mcp__n8n_create_workflow`, `mcp__n8n-mcp__n8n_update_workflow`, `mcp__elevenlabs__*`, `mcp__servicetitan__*`.

#### Scenario: n8n create matched

- **GIVEN** tool_name is `mcp__n8n-mcp__n8n_create_workflow`
- **WHEN** the hook executes
- **THEN** all precondition checks are performed

#### Scenario: ElevenLabs tool matched

- **GIVEN** tool_name is `mcp__elevenlabs__create_agent`
- **WHEN** the hook executes
- **THEN** all precondition checks are performed
