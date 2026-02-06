# Change: Add Voice Agent Testing Engine

**Status: IN PROGRESS - Implementation ~80% complete**

## Why

Issue #26: Cannot programmatically test ElevenLabs agent flows end-to-end. The Voice Agent Tester workflow (`uShlKp2CxOsp0ubC`) exists with 5 default customer support scenarios, but no local Vitest tests exist for code nodes, no JSON test profile tracks coverage, and the entity had zero test-run-registry entries, blocking governance gates.

## What Changes

- **ADDED** `voice-agent-testing` capability: local Vitest test suite for workflow code nodes, JSON test profile (25 cases), workflow enhancement with dual-trigger and category filtering, and governance integration (test-run-registry tracking)
- Extracted live code node logic (`analyzeResults`, `generateReport`) for local testing
- Created JSON test profile following the `llm_data_collection` pattern
- Added `execute_workflow_trigger` for dual-trigger pattern compliance
- Added category filtering to Initialize Test Suite
- Removed hardcoded API key (now uses `$env.ELEVENLABS_API_KEY`)
- Registered entity in test-run-registry (primordial pipeline pending live API runs)

## Impact

- Affected specs: `voice-agent-testing` (new capability)
- Affected code:
  - `tests/code-nodes/voice-agent-tester/` (new local test suite - 66 tests passing)
  - `workflows/voice_ai_agents/test-fixtures/test-profile.json` (new test profile - 25 cases)
  - Voice Agent Tester workflow `uShlKp2CxOsp0ubC` (n8n partial update - 7 nodes)
  - `ledger/test-run-registry.json` (new entity: `elevenlabs-agent-testing-framework`)
  - `hooks/src/governance/n8n_download_blocker.ts` (read-only modes added - 15 tests)
- Related issue: #26
- Related workflows: Voice Agent Tester (`uShlKp2CxOsp0ubC`), Conversation Reprocessor (`5CmDvqF0GloEr7be`)

## Non-Goals

- Does not modify the ElevenLabs `simulate_conversation` API behavior
- Does not create a mock server for local ElevenLabs simulation (deferred to future work per issue #26 desired solution #2)
- Does not add CI/CD pipeline integration (requires mock server or sandbox API first)
- Does not modify the Conversation Reprocessor workflow

## Implementation Status

| Phase | Status | Details |
|-------|--------|---------|
| A. OpenSpec Proposal | DONE | proposal, design, tasks, spec delta created |
| B. Local Vitest Tests | DONE | 66 tests across analyze-results + generate-report |
| C. JSON Test Profile | DONE | 25 test cases (10 simulation, 10 transformation, 5 integration) |
| D. Workflow Enhancement | DONE | Dual-trigger, category filter, env var API key |
| E. Governance Integration | PARTIAL | Entity registered; 0/3 primordial runs (requires live API) |
| F. Hook Fix (unplanned) | DONE | n8n_download_blocker read-only modes (15 tests) |

## Remaining Work

1. **Smoke test** - Trigger workflow `uShlKp2CxOsp0ubC` via webhook with live ElevenLabs API
2. **Primordial pipeline** - 3 novel test runs with unique SHA-256 input hashes
3. **[DEV] tag removal** - Requires 98%+ success rate after primordial runs
