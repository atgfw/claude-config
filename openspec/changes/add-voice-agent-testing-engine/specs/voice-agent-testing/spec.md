# Spec Delta: Voice Agent Testing Engine

**Capability:** `voice-agent-testing`
**Change ID:** `add-voice-agent-testing-engine`
**Live Workflow:** `uShlKp2CxOsp0ubC` ("ElevenLabs Agent Testing Framework - Enhanced")
**Default Agent:** `agent_01k07qdntze1w9q8d87jmx4w1n`

## ADDED Requirements

### Requirement: Local Vitest suite for code node logic [IMPLEMENTED]

The system SHALL provide a local Vitest test suite at `tests/code-nodes/voice-agent-tester/` that validates extracted code node logic from the Voice Agent Tester workflow without requiring ElevenLabs API calls.

#### Scenario: Analyze results from ElevenLabs API response

- **GIVEN** an API response JSON containing `simulated_conversation` and `analysis` fields
- **WHEN** `analyzeResults()` is invoked with the response, scenario, and config
- **THEN** it returns structured output with combined score (70% API criteria + 30% expected outcomes), success determination, and evaluation details

#### Scenario: Analyze results with missing or invalid data

- **GIVEN** an API response JSON with invalid structure or a null/nameless scenario
- **WHEN** `analyzeResults()` is invoked
- **THEN** it returns an error result with `success: false` and descriptive `error` field without throwing

#### Scenario: Generate report from single scenario result

- **GIVEN** a scenario result object with scores, outcomes, and evaluation criteria
- **WHEN** `generateReport()` is invoked with the result, config, and scenario list
- **THEN** it returns a structured report with execution summary, quality assessment, recommendations, and scenario library

### Requirement: JSON test profile for governance tracking [IMPLEMENTED]

The system SHALL maintain a JSON test profile at `workflows/voice_ai_agents/test-fixtures/test-profile.json` containing all test case definitions with metadata, inputs, and expected outputs.

#### Scenario: Test profile contains simulation scenarios

- **GIVEN** the test-profile.json file exists
- **WHEN** its `test_cases` array is filtered by category `simulation`
- **THEN** it contains 10 simulation test cases with scenario prompts, expected tool calls, and evaluation criteria

#### Scenario: Test profile includes transformation and integration cases

- **GIVEN** the test-profile.json file exists
- **WHEN** its `test_cases` array is filtered by category
- **THEN** it contains simulation cases (10), transformation cases (10 schema mapping), and integration cases (5 pipeline E2E)

### Requirement: Workflow accepts scenarios from webhook and subworkflow input [IMPLEMENTED]

The Voice Agent Tester workflow (`uShlKp2CxOsp0ubC`) SHALL accept custom scenarios via webhook body and support category filtering.

#### Scenario: Custom scenarios passed via webhook body

- **GIVEN** the workflow is triggered via webhook with `{ "scenarios": [...], "agent_id": "...", "category": "..." }`
- **WHEN** Initialize Test Suite processes the input
- **THEN** it uses the provided scenarios (optionally filtered by category) instead of defaults

#### Scenario: Scenarios filterable by category

- **GIVEN** the workflow receives a `category` parameter (e.g., `support`, `billing`, `urgent`, `sales`)
- **WHEN** it initializes scenarios
- **THEN** only scenarios matching the specified category are selected

### Requirement: Dual-trigger pattern for programmatic execution [IMPLEMENTED]

The Voice Agent Tester workflow SHALL have both an `executeWorkflowTrigger` and a webhook trigger, enabling programmatic test execution via subworkflow calls or direct HTTP.

#### Scenario: Triggered via execute workflow

- **GIVEN** the workflow has dual triggers configured (7 nodes total)
- **WHEN** another workflow calls it as a subworkflow
- **THEN** the workflow executes through the same pipeline as webhook invocation

### Requirement: Test-run-registry governance integration [PARTIAL]

The system SHALL register the `elevenlabs-agent-testing-framework` entity in `ledger/test-run-registry.json` and track novel test runs with unique SHA-256 input hashes.

#### Scenario: Entity registered with local-tests-pass status

- **GIVEN** the entity exists in test-run-registry.json
- **WHEN** the registry is inspected
- **THEN** it shows `status: "local-tests-pass"`, `workflowId: "uShlKp2CxOsp0ubC"`, and self-audit checklist with spec_phase, build_phase, local_tests = true

#### Scenario: Three primordial pipeline runs recorded [PENDING]

- **GIVEN** the entity exists in test-run-registry.json
- **WHEN** 3 test executions with distinct input data have completed via live API
- **THEN** the registry contains 3 entries with unique `inputHash` values

### Requirement: Per-scenario evaluation report [IMPLEMENTED]

The Voice Agent Tester workflow SHALL produce a structured report containing execution summary, quality assessment, and recommendations.

#### Scenario: Report includes quality assessment

- **GIVEN** a scenario has been executed
- **WHEN** the report is generated
- **THEN** it includes conversation quality (Good/Short), response quality (Detailed/Brief), data collection (Active/Limited), and criteria evaluation (Present/Missing)

#### Scenario: Report includes performance recommendations

- **GIVEN** a scenario result with overall_score
- **WHEN** the report is generated
- **THEN** it provides performance rating (Excellent >= 80, Good 60-79, Needs Improvement < 60) and context-appropriate next steps

### Requirement: Recursive feedback loop test runner [IMPLEMENTED]

The system SHALL provide a local test runner script at `tests/code-nodes/voice-agent-tester/test-runner.ts` that orchestrates both ElevenLabs APIs in a recursive feedback loop following the scientific method.

#### Scenario: Dry run executes all phases without API calls

- **GIVEN** the test runner is invoked with `--dry-run`
- **WHEN** it loads scenarios and iterates through phases
- **THEN** it logs all phases (Hypothesis through Record) without making HTTP requests, and completes successfully

#### Scenario: Live run calls simulate_conversation API with correct request body

- **GIVEN** the test runner is invoked without `--dry-run`
- **WHEN** `runSimulation()` is called for a scenario
- **THEN** it POSTs to `/v1/convai/agents/{id}/simulate-conversation` with `simulation_specification.simulated_user_config.prompt = {prompt, llm, temperature}` and `extra_evaluation_criteria` array

#### Scenario: Response transformation maps API format to internal format

- **GIVEN** simulate_conversation returns `{conversation_history, evaluation_results}`
- **WHEN** the response is processed by `runSimulation()`
- **THEN** it is transformed to `{simulated_conversation, analysis: {evaluation_criteria_results, data_collection_results, call_successful}}` for consumption by `analyzeResults()`

#### Scenario: Live run calls Tests API with correct request body

- **GIVEN** the test runner is invoked without `--dry-run`
- **WHEN** `createTest()` is called for a scenario
- **THEN** it POSTs to `/v1/convai/agent-testing/create` with `{name, chat_history: [{role, time_in_call_secs}], success_condition, success_examples: [{response, type}], failure_examples: [{response, type}]}`

#### Scenario: Convergence detection stops iteration

- **GIVEN** the test runner is configured with `--max-iterations 3` and threshold 70
- **WHEN** an iteration produces aggregate_score >= 70
- **THEN** the loop terminates early without running remaining iterations

#### Scenario: Results recorded to test-run-registry

- **GIVEN** a live run completes an iteration
- **WHEN** `recordResult()` is called
- **THEN** it writes to `ledger/test-run-registry.json` under the `elevenlabs-agent-testing-framework` entity key with a novel SHA-256 input hash

### Requirement: Test runner unit tests [IMPLEMENTED]

The system SHALL have 18 Vitest tests at `tests/code-nodes/voice-agent-tester/test-runner.test.ts` covering scenario loading, analysis pipeline, recommendation generation, report generation, convergence logic, and input hash uniqueness.

#### Scenario: All test runner unit tests pass

- **GIVEN** the test runner test file exists
- **WHEN** `bun test ./tests/code-nodes/voice-agent-tester/test-runner.test.ts` is executed
- **THEN** all 18 tests pass with 0 failures
