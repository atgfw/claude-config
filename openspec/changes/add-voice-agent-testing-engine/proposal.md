# Change: Add Voice Agent Testing Engine

## Why

Issue #26: Cannot programmatically test ElevenLabs agent flows end-to-end. The Voice Agent Tester workflow (`IZIj5oh3VwCVJb34`) exists with 4 hardcoded scenarios, but 6 of 10 YAML scenarios remain unintegrated. No local Vitest tests exist for code nodes, no JSON test profile tracks coverage, and no test-run-registry entries enable governance gate compliance.

## What Changes

- **ADDED** `voice-agent-testing` capability: local Vitest test suite for workflow code nodes, JSON test profile (35+ cases), workflow enhancement to consume all 10 YAML scenarios, and governance integration (test-run-registry tracking, primordial pipeline)
- Link remaining 6 YAML scenarios into the Voice Agent Tester workflow via partial update
- Extract code nodes for local testing (parse-simulation-response, generate-report)
- Create JSON test profile following the `llm_data_collection` pattern
- Register entity in test-run-registry and execute 3 novel primordial pipeline runs

## Impact

- Affected specs: `voice-agent-testing` (new capability)
- Affected code:
  - `tests/code-nodes/voice-agent-tester/` (new local test suite)
  - `workflows/voice_ai_agents/test-fixtures/test-profile.json` (new test profile)
  - Voice Agent Tester workflow `IZIj5oh3VwCVJb34` (n8n partial update)
  - `ledger/test-run-registry.json` (new entity entries)
- Related issue: #26
- Related workflows: Voice Agent Tester (`IZIj5oh3VwCVJb34`), Conversation Reprocessor (`5CmDvqF0GloEr7be`)

## Non-Goals

- Does not modify the ElevenLabs `simulate_conversation` API behavior
- Does not create a mock server for local ElevenLabs simulation (deferred to future work per issue #26 desired solution #2)
- Does not add CI/CD pipeline integration (requires mock server or sandbox API first)
- Does not modify the Conversation Reprocessor workflow
