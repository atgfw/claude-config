# Change: Add Voice Agent Testing Engine

**Status: IN PROGRESS - Live API Validation Pending (~90% complete)**

## Why

Issue #26: Cannot programmatically test ElevenLabs agent flows end-to-end. The Voice Agent Tester workflow (`uShlKp2CxOsp0ubC`) exists with 5 default customer support scenarios, but no local Vitest tests exist for code nodes, no JSON test profile tracks coverage, and the entity had zero test-run-registry entries, blocking governance gates.

## What Changes

- **ADDED** `voice-agent-testing` capability: local Vitest test suite for workflow code nodes (84 tests), JSON test profile (25 cases), workflow enhancement with dual-trigger and category filtering, and governance integration (test-run-registry tracking)
- **ADDED** `test-runner.ts`: Recursive feedback loop orchestrator using both ElevenLabs APIs (simulate_conversation + Tests API) with scientific method phases
- **ADDED** `test-runner.test.ts`: 18 Vitest tests for test runner pure logic
- Extracted live code node logic (`analyzeResults`, `generateReport`) for local testing
- Created JSON test profile following the `llm_data_collection` pattern
- Added `execute_workflow_trigger` for dual-trigger pattern compliance
- Added category filtering to Initialize Test Suite
- Removed hardcoded API key (now uses `input.api_key` from webhook body, NOT `$env`)
- Registered entity in test-run-registry (primordial pipeline pending live API runs)

## Impact

- Affected specs: `voice-agent-testing` (new capability)
- Affected code:
  - `tests/code-nodes/voice-agent-tester/` (local test suite - 84 tests passing: 32 + 34 + 18)
  - `tests/code-nodes/voice-agent-tester/test-runner.ts` (recursive test orchestrator - ~770 lines)
  - `workflows/voice_ai_agents/test-fixtures/test-profile.json` (test profile - 25 cases)
  - Voice Agent Tester workflow `uShlKp2CxOsp0ubC` (n8n partial update - 7 nodes)
  - `ledger/test-run-registry.json` (entity: `elevenlabs-agent-testing-framework`)
  - `hooks/src/governance/n8n_download_blocker.ts` (read-only modes added - 15 tests)
- Related issues: codya/.claude#26, codya/n8n_n8n#14, codya/.claude#45
- Related workflows: Voice Agent Tester (`uShlKp2CxOsp0ubC`), Conversation Reprocessor (`5CmDvqF0GloEr7be`)

## Non-Goals

- Does not modify the ElevenLabs `simulate_conversation` API behavior
- Does not create a mock server for local ElevenLabs simulation
- Does not add CI/CD pipeline integration (requires primordial pipeline completion first)
- Does not modify the Conversation Reprocessor workflow

## Implementation Status

| Phase | Status | Details |
|-------|--------|---------|
| A. OpenSpec Proposal | DONE | proposal, design, tasks, spec delta created |
| B. Local Vitest Tests | DONE | 84 tests across analyze-results + generate-report + test-runner |
| C. JSON Test Profile | DONE | 25 test cases (10 simulation, 10 transformation, 5 integration) |
| D. Workflow Enhancement | DONE | Dual-trigger, category filter, input-only API key |
| E. Governance Integration | PARTIAL | Entity registered; 0/3 primordial runs (requires live API) |
| F. Hook Fix (unplanned) | DONE | n8n_download_blocker read-only modes (15 tests) |
| G. API Key Fix | DONE | Removed `$env.ELEVENLABS_API_KEY`, input-only in workflow |
| H. Test Runner Script | DONE | Recursive orchestrator with both APIs + scientific method |
| I. API Bug Fixes | DONE | Fixed request bodies, response transformation, registry access |

## Remaining Work

1. **Live API validation** - Run `test-runner.ts --max-iterations 1 --category happy_path` and debug any remaining API errors
2. **Primordial pipeline** - 3 novel test runs with unique SHA-256 input hashes
3. **[DEV] tag removal** - Requires 98%+ success rate after primordial runs

## Plan Reference

Full plan with API schemas, bug fix history, and verification commands: `~/.claude/plans/transient-giggling-hedgehog.md`
