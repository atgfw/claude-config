# Design: Voice Agent Testing Engine

**Status: IMPLEMENTED - Architecture validated against live workflow**

## Context

The live n8n workflow `uShlKp2CxOsp0ubC` ("ElevenLabs Agent Testing Framework - Enhanced") provides programmatic voice agent testing via the ElevenLabs `simulate_conversation` API. A Conversation Reprocessor workflow (`5CmDvqF0GloEr7be`) handles post-call data transformation.

### Live Infrastructure (verified 2026-02-06)

| Asset | ID/Location | Status |
|-------|-------------|--------|
| Voice Agent Tester workflow | `uShlKp2CxOsp0ubC` | Live, 7 nodes, [DEV], dual-trigger |
| Conversation Reprocessor workflow | `5CmDvqF0GloEr7be` | Live, functional |
| Test scenarios YAML | `workflows/voice_ai_agents/test-scenarios.yaml` | 10 scenarios defined |
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

- **Initialize Test Suite**: Accepts scenarios via webhook body or uses 5 defaults; supports category filtering
- **Run ElevenLabs Simulation**: POST to `simulate_conversation` API with scenario prompt
- **Analyze Results**: Parses API response, scores against evaluation criteria (70% API + 30% outcomes)
- **Generate Test Report**: Builds execution summary, quality assessment, recommendations

## Goals / Non-Goals

- **Goals**: Local code node testing, scenario integration, JSON test profile, governance compliance
- **Non-Goals**: Mock ElevenLabs API server, CI/CD pipeline wiring, modifying Reprocessor workflow

## Decisions

### 1. Three-layer test architecture

```
test-profile.json (25 cases)
        |
   +---------+---------+
   |         |         |
Vitest    n8n Tester  Integration
(local)   (workflow)   (E2E)
   |         |         |
   +---------+---------+
             |
    test-run-registry.json
```

- **Vitest (local)**: Unit tests for extracted code node logic (`analyzeResults`, `generateReport`). Fast, deterministic, no API dependency. 66 tests passing.
- **n8n Tester (workflow)**: Scenarios executed via `simulate_conversation` API through the live workflow. Requires ElevenLabs API key.
- **Integration (E2E)**: Tester-to-Reprocessor pipeline validation.

**Rationale**: Matches existing patterns (st-call-association has local Vitest + workflow tests). Local tests catch logic regressions without API calls; workflow tests validate live behavior.

### 2. Scenarios passed via webhook body (not YAML at runtime)

The live workflow accepts `input.scenarios` from the webhook/subworkflow body, falling back to 5 hardcoded defaults. Custom scenarios (including the 10 YAML scenarios) are passed at invocation time rather than loaded from a file at runtime.

**Rationale**: The live workflow already supports this pattern. Loading YAML at runtime would require adding a file-read node and js-yaml dependency, adding complexity for minimal benefit when the caller can pass scenarios directly.

### 3. JSON test profile follows llm_data_collection pattern

The test profile at `workflows/voice_ai_agents/test-fixtures/test-profile.json` mirrors the structure used by `workflows/llm_data_collection/test-fixtures/test-profile.json`. Contains 25 test cases across simulation, transformation, and integration categories.

### 4. Combined scoring model (70% API / 30% outcomes)

The live Analyze Results node uses a weighted scoring model:
- **API criteria** (70%): Based on `evaluation_criteria_results` from ElevenLabs API
- **Expected outcomes** (30%): Validated against `data_collection_results` and conversation text
- **Success threshold**: Configurable (default 70), requires both `call_successful === 'success'` AND score >= threshold

### 5. Dual-trigger pattern

Added `execute_workflow_trigger` alongside the existing webhook trigger, enabling programmatic test execution via subworkflow calls. Both triggers feed into the same Initialize Test Suite node.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| ElevenLabs API rate limits during batch testing | Add configurable delay between scenarios; batch by category |
| Simulation non-determinism (LLM temperature) | Use evaluation criteria (pass/fail on behavior) not exact transcript matching |
| Single-scenario execution (no loop) | Current architecture processes first scenario only; multi-scenario loop is future enhancement |
| API key exposure | Moved from hardcoded to `$env.ELEVENLABS_API_KEY` |

## Open Questions

- Multi-scenario looping: Current workflow processes only the first matching scenario. Adding SplitInBatches + aggregation for all-scenario execution is a future enhancement.
