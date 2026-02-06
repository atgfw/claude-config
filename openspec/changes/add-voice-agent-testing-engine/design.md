# Design: Voice Agent Testing Engine

## Context

Two live n8n workflows exist for voice agent testing and reprocessing. A YAML file defines 10 test scenarios, but only 4 are wired into the tester workflow. No local test infrastructure exists -- code node logic is untested, there is no JSON test profile, and the entity has zero test-run-registry entries, blocking governance gates.

### Existing Infrastructure

| Asset | ID/Location | Status |
|-------|-------------|--------|
| Voice Agent Tester workflow | `IZIj5oh3VwCVJb34` | Live, 4 scenarios hardcoded |
| Conversation Reprocessor workflow | `5CmDvqF0GloEr7be` | Live, functional |
| Test scenarios YAML | `workflows/voice_ai_agents/test-scenarios.yaml` | 10 scenarios defined |
| Post-call webhook ground truth | `workflows/voice_ai_agents/post-call-webhook-examples.jsonl` | Exists |
| Conversation export ground truth | `workflows/voice_ai_agents/conversation-export-examples.jsonl` | Exists |

## Goals / Non-Goals

- **Goals**: Local code node testing, full scenario integration, JSON test profile, governance compliance
- **Non-Goals**: Mock ElevenLabs API server, CI/CD pipeline wiring, modifying Reprocessor workflow

## Decisions

### 1. Three-layer test architecture

```
test-profile.json (35+ cases)
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

- **Vitest (local)**: Unit tests for extracted code node logic (parse simulation responses, generate reports). Fast, deterministic, no API dependency.
- **n8n Tester (workflow)**: All 10 YAML scenarios executed via `simulate_conversation` API through the live workflow. Requires ElevenLabs API key.
- **Integration (E2E)**: Tester-to-Reprocessor pipeline validation. Runs a simulation, then reprocesses the resulting conversation to verify end-to-end data flow.

**Rationale**: Matches existing patterns in the project (st-call-association has local Vitest + workflow tests). Local tests catch logic regressions without API calls; workflow tests validate live behavior.

### 2. YAML consumed at workflow runtime, not pre-converted

The Voice Agent Tester workflow will load `test-scenarios.yaml` at runtime via a code node using `js-yaml` (available in n8n code nodes). This keeps the YAML as the single source of truth rather than maintaining parallel JSON.

**Alternative considered**: Pre-convert YAML to JSON and embed in workflow. Rejected because it creates a sync problem -- YAML edits would not propagate without a manual conversion step.

### 3. JSON test profile follows llm_data_collection pattern

The test profile at `workflows/voice_ai_agents/test-fixtures/test-profile.json` mirrors the structure used by `workflows/llm_data_collection/test-fixtures/test-profile.json`. This provides:
- `meta` block with workflow ID, test count, version
- `test_cases` array with category, inputs, expected outputs, evaluation criteria
- Machine-readable format for governance hooks to consume

### 4. Dual-trigger pattern for webhook-initiated testing

The Voice Agent Tester workflow will add an `executeWorkflowTrigger` alongside its existing trigger, following the project-wide dual-trigger pattern enforced by `n8n_dual_trigger_validator`. This enables programmatic test execution via `mcp__n8n-mcp__n8n_test_workflow`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| ElevenLabs API rate limits during batch testing | Add configurable delay between scenarios in workflow; batch by category |
| Simulation non-determinism (LLM temperature) | Use evaluation criteria (pass/fail on behavior) not exact transcript matching |
| js-yaml not available in n8n code nodes | Fallback: simple YAML parser for the flat structure used, or pre-load as JSON |
| Workflow partial updates may conflict | Read current workflow state before update; atomic operations |

## Open Questions

None -- the plan is straightforward and builds on established patterns.
