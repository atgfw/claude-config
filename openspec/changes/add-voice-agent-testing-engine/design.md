# Design: Voice Agent Testing Engine

**Status: IMPLEMENTED - Architecture Pivot to Recursive Feedback Loop**

## Context

The live n8n workflow `uShlKp2CxOsp0ubC` ("ElevenLabs Agent Testing Framework - Enhanced") provides programmatic voice agent testing via the ElevenLabs `simulate_conversation` API. A Conversation Reprocessor workflow (`5CmDvqF0GloEr7be`) handles post-call data transformation.

An architecture pivot added a local **recursive feedback loop test runner** (`test-runner.ts`) that orchestrates both ElevenLabs APIs directly, bypassing the n8n workflow for test execution while reusing the extracted scoring and reporting logic.

### Live Infrastructure (verified 2026-02-06)

| Asset | ID/Location | Status |
|-------|-------------|--------|
| Voice Agent Tester workflow | `uShlKp2CxOsp0ubC` | Live, 7 nodes, [DEV], dual-trigger |
| Conversation Reprocessor workflow | `5CmDvqF0GloEr7be` | Live, functional |
| Test scenarios YAML | `workflows/voice_ai_agents/test-scenarios.yaml` | 10 scenarios defined |
| Test runner (local) | `tests/code-nodes/voice-agent-tester/test-runner.ts` | ~770 lines, dry-run validated |
| Default agent | `agent_01k07qdntze1w9q8d87jmx4w1n` | Customer support agent |
| Post-call webhook ground truth | `workflows/voice_ai_agents/post-call-webhook-examples.jsonl` | Exists |
| Conversation export ground truth | `workflows/voice_ai_agents/conversation-export-examples.jsonl` | Exists |

### Live Workflow Architecture (7 nodes)

```
Webhook Trigger ----\
                     +--> Initialize Test Suite --> Run ElevenLabs Simulation
execute_workflow_trigger --/            |
                                        v
                              Analyze Results --> Generate Test Report --> Return Results
```

- **Initialize Test Suite**: Accepts scenarios via webhook body or uses 5 defaults; supports category filtering; API key from `input.api_key` only (NOT `$env`)
- **Run ElevenLabs Simulation**: POST to `simulate_conversation` API with scenario prompt
- **Analyze Results**: Parses API response, scores against evaluation criteria (70% API + 30% outcomes)
- **Generate Test Report**: Builds execution summary, quality assessment, recommendations

### Local Test Runner Architecture (test-runner.ts)

```
CLI Args (--dry-run, --max-iterations, --category)
     |
     v
[1. HYPOTHESIS] loadScenarios() from test-profile.json
     |
     v
[2. EXPERIMENT] runSimulation() + createTest()/runTests()
     |           (both ElevenLabs APIs called in sequence)
     |
     v
[3-4. OBSERVATION+ANALYSIS] analyzeIteration()
     |                        (reuses analyzeResults from analyze-results.js)
     |
     v
[5. REFINEMENT] generateRecommendations()
     |
     v
[6. REPEAT] if aggregate_score < threshold && iter < max
     |
     v
[7. RECORD] recordResult() -> test-run-registry.json
```

**Key design decision**: The test runner calls ElevenLabs APIs directly rather than going through the n8n workflow. This enables:
- Faster iteration (no n8n overhead)
- Direct error messages from API
- Local-only execution (no n8n instance required for testing)
- Reuses the same scoring/reporting logic via `analyzeResults()` and `generateReport()`

**Response transformation**: The simulate_conversation API returns `{conversation_history, evaluation_results}` but `analyzeResults()` expects `{simulated_conversation, analysis.evaluation_criteria_results}`. The `runSimulation()` function handles this mapping.

## Goals / Non-Goals

- **Goals**: Local code node testing, scenario integration, JSON test profile, governance compliance, recursive feedback loop with convergence detection
- **Non-Goals**: Mock ElevenLabs API server, CI/CD pipeline wiring, modifying Reprocessor workflow

## Decisions

### 1. Four-layer test architecture

```
test-profile.json (25 cases)
        |
   +----+----+---------+---------+
   |         |         |         |
Vitest    Test Runner n8n Tester Integration
(local)   (local+API) (workflow)  (E2E)
84 tests   both APIs   simulate   tester->reprocessor
   |         |         |         |
   +----+----+---------+---------+
             |
    test-run-registry.json
```

- **Vitest (local)**: Unit tests for extracted code node logic. Fast, deterministic. 84 tests passing (32 + 34 + 18).
- **Test Runner (local+API)**: Recursive orchestrator calling both ElevenLabs APIs directly. Used for primordial pipeline runs.
- **n8n Tester (workflow)**: Scenarios executed through the live n8n workflow. Requires deployed workflow + API key in n8n credential.
- **Integration (E2E)**: Tester-to-Reprocessor pipeline validation.

### 2. Scenarios passed via webhook body (not YAML at runtime)

The live workflow accepts `input.scenarios` from the webhook/subworkflow body, falling back to 5 hardcoded defaults. The test runner loads scenarios from `test-profile.json` locally.

### 3. JSON test profile follows llm_data_collection pattern

The test profile at `workflows/voice_ai_agents/test-fixtures/test-profile.json` mirrors the structure used by `workflows/llm_data_collection/test-fixtures/test-profile.json`. Contains 25 test cases across simulation, transformation, and integration categories.

### 4. Combined scoring model (70% API / 30% outcomes)

The live Analyze Results node uses a weighted scoring model:
- **API criteria** (70%): Based on `evaluation_criteria_results` from ElevenLabs API
- **Expected outcomes** (30%): Validated against `data_collection_results` and conversation text
- **Success threshold**: Configurable (default 70), requires both `call_successful === 'success'` AND score >= threshold

### 5. Dual-trigger pattern

Added `execute_workflow_trigger` alongside the existing webhook trigger, enabling programmatic test execution via subworkflow calls. Both triggers feed into the same Initialize Test Suite node.

### 6. API key from input only (not $env)

The workflow's Initialize Test Suite was updated to use `input.api_key` exclusively, never `$env.ELEVENLABS_API_KEY`. The test runner loads the key from `~/.claude/.env` directly.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| ElevenLabs API rate limits during batch testing | 2s delay between scenarios; batch by category |
| Simulation non-determinism (LLM temperature) | Use evaluation criteria (pass/fail on behavior) not exact transcript matching |
| simulate_conversation 500 errors | Request body validated against API docs; `llm` field value may need adjustment |
| API key exposure | Key loaded from `~/.claude/.env`; never committed; workflow uses `input.api_key` |
| Registry schema mismatch | Fixed: entities stored as object keys, not array; tested in unit tests |

## Open Questions

- **LLM model for simulation**: Currently `gemini-3-flash-preview`. ElevenLabs may not support this model. May need to omit the `llm` field or try `gpt-5.2`.
- **Tests API chat_history.content**: Current implementation sends `{role, time_in_call_secs}` without `content`. May need to add scenario prompt as content.
