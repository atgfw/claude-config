# Spec Delta: Voice Agent Testing Engine

**Capability:** `voice-agent-testing`
**Change ID:** `add-voice-agent-testing-engine`

## ADDED Requirements

### Requirement: Local Vitest suite for code node logic

The system SHALL provide a local Vitest test suite at `tests/code-nodes/voice-agent-tester/` that validates extracted code node logic from the Voice Agent Tester workflow without requiring ElevenLabs API calls.

#### Scenario: Parse simulation response with tool calls

- **GIVEN** a simulation response JSON containing transcript entries and tool call records
- **WHEN** `parseSimulationResponse()` is invoked
- **THEN** it returns structured output with extracted tool calls, evaluation results, and conversation summary

#### Scenario: Parse simulation response with missing data

- **GIVEN** a simulation response JSON with missing or null transcript/tool_calls fields
- **WHEN** `parseSimulationResponse()` is invoked
- **THEN** it returns a result with empty arrays and appropriate error flags without throwing

#### Scenario: Generate report from multiple scenario results

- **GIVEN** an array of scenario result objects with pass/fail evaluation criteria
- **WHEN** `generateReport()` is invoked
- **THEN** it returns a structured report with per-scenario breakdown, overall pass rate, and category-level aggregation

### Requirement: JSON test profile for governance tracking

The system SHALL maintain a JSON test profile at `workflows/voice_ai_agents/test-fixtures/test-profile.json` containing all test case definitions with metadata, inputs, and expected outputs.

#### Scenario: Test profile contains all 10 YAML scenarios

- **GIVEN** the test-profile.json file exists
- **WHEN** its `test_cases` array is inspected
- **THEN** it contains entries corresponding to all 10 scenarios from `test-scenarios.yaml` with matching IDs

#### Scenario: Test profile includes transformation and integration cases

- **GIVEN** the test-profile.json file exists
- **WHEN** its `test_cases` array is filtered by category
- **THEN** it contains simulation cases (from YAML), transformation cases (schema mapping), and integration cases (tester-to-reprocessor pipeline)

### Requirement: Workflow consumes all YAML scenarios

The Voice Agent Tester workflow (`IZIj5oh3VwCVJb34`) SHALL execute all 10 scenarios defined in `test-scenarios.yaml`, not just the 4 currently hardcoded.

#### Scenario: All 10 scenarios execute successfully

- **GIVEN** the Voice Agent Tester workflow is triggered
- **WHEN** it loads scenarios from `test-scenarios.yaml`
- **THEN** it executes simulations for all 10 scenarios and produces per-scenario results

#### Scenario: Scenarios filterable by category

- **GIVEN** the workflow receives a `category` parameter (e.g., `happy_path`, `edge_case`, `stress_test`, `tool_validation`)
- **WHEN** it loads scenarios
- **THEN** only scenarios matching the specified category are executed

### Requirement: Dual-trigger pattern for programmatic execution

The Voice Agent Tester workflow SHALL have both an `executeWorkflowTrigger` and its existing trigger, enabling programmatic test execution via `mcp__n8n-mcp__n8n_test_workflow`.

#### Scenario: Triggered via n8n-MCP test command

- **GIVEN** the workflow has dual triggers configured
- **WHEN** `mcp__n8n-mcp__n8n_test_workflow` is invoked with `workflowId: "IZIj5oh3VwCVJb34"`
- **THEN** the workflow executes and returns test results

### Requirement: Test-run-registry governance integration

The system SHALL register the `voice-agent-tester` entity in `ledger/test-run-registry.json` and track novel test runs with unique SHA-256 input hashes.

#### Scenario: Three primordial pipeline runs recorded

- **GIVEN** the voice-agent-tester entity exists in test-run-registry.json
- **WHEN** 3 test executions with distinct input data have completed
- **THEN** the registry contains 3 entries with unique `inputHash` values for the entity

#### Scenario: Governance gate passes after primordial pipeline

- **GIVEN** 3 novel runs are recorded in the registry
- **WHEN** `cloud_object_creation_gate` checks the entity
- **THEN** the primordial pipeline check passes

### Requirement: Per-scenario evaluation report

The Voice Agent Tester workflow SHALL produce a structured report containing per-scenario pass/fail results, evaluation criteria outcomes, and an overall success rate.

#### Scenario: Report shows per-scenario breakdown

- **GIVEN** 10 scenarios have been executed
- **WHEN** the report is generated
- **THEN** each scenario has its own result block with evaluation criteria verdicts and an overall pass/fail status

#### Scenario: Success rate calculated correctly

- **GIVEN** 8 of 10 scenarios pass all evaluation criteria
- **WHEN** the report success rate is calculated
- **THEN** it reports 80% success rate
