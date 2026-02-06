# Tasks: Add Voice Agent Testing Engine

## 1. Local Vitest Test Suite

- [x] 1.1 Extract `analyze-results` code node logic from live workflow (`uShlKp2CxOsp0ubC`) into `tests/code-nodes/voice-agent-tester/analyze-results.js`
- [x] 1.2 Extract `generate-report` code node logic into `tests/code-nodes/voice-agent-tester/generate-report.js`
- [x] 1.3 Write `tests/code-nodes/voice-agent-tester/analyze-results.test.ts` (32 tests): API response parsing (direct + wrapped formats), API criteria scoring, expected outcomes validation, combined 70/30 score calculation, success threshold, error handling
- [x] 1.4 Write `tests/code-nodes/voice-agent-tester/generate-report.test.ts` (34 tests): execution summary, scenario results with scores, outcome success rate, quality assessment, recommendations, scenario library, raw data passthrough
- [x] 1.5 Run `bun test tests/code-nodes/voice-agent-tester/` - all 66 tests pass

## 2. JSON Test Profile

- [x] 2.1 Create `workflows/voice_ai_agents/test-fixtures/` directory
- [x] 2.2 Create `test-profile.json` with `meta` block (workflow ID `uShlKp2CxOsp0ubC`, version, test count) and `test_cases` array
- [x] 2.3 Port all 10 YAML scenarios into JSON test case format with inputs, expected tool calls, and evaluation criteria
- [x] 2.4 Add transformation test cases (10 conversation export to webhook format schema mapping)
- [x] 2.5 Add integration test case definitions (5 tester-to-reprocessor pipeline)

## 3. Workflow Enhancement

- [x] 3.1 Read current workflow state via `mcp__n8n-mcp__n8n_get_workflow` with `mode: "structure"` and `mode: "full"` (documentation_only)
- [x] 3.2 Update `Initialize Test Suite` with category filtering support (input.category param filters scenarios)
- [x] 3.3 Add `category` field to all 5 default scenarios (support, billing, urgent, sales)
- [x] 3.4 Remove hardcoded API key - use `$env.ELEVENLABS_API_KEY` with fallback
- [x] 3.5 Add `execute_workflow_trigger` for dual-trigger pattern compliance (7 nodes total)
- [x] 3.6 Push updates via `mcp__n8n-mcp__n8n_update_partial_workflow` (5 operations, all validated)
- [x] 3.7 Fix pre-existing webhook error (onError for responseNode mode)
- [ ] 3.8 Smoke test: trigger workflow via webhook and verify scenario execution (requires ElevenLabs API key in n8n env)

## 4. Governance Integration

- [x] 4.1 Add `elevenlabs-agent-testing-framework` entity to `ledger/test-run-registry.json` (status: local-tests-pass)
- [ ] 4.2 Execute primordial pipeline run 1 with novel input data (requires live API)
- [ ] 4.3 Execute primordial pipeline run 2 with novel input data (requires live API)
- [ ] 4.4 Execute primordial pipeline run 3 with novel input data (requires live API)
- [ ] 4.5 Verify registry has 3 entries with unique SHA-256 `inputHash` values

## 5. Issue Lifecycle

- [x] 5.1 Update issue #26 labels: moved `lifecycle/triage` to `lifecycle/specced`
- [x] 5.2 Added comment to issue #26 linking OpenSpec change

## 6. Hook Enhancement

- [x] 6.1 Fix `n8n_download_blocker` to allow read-only modes (structure, minimal, details)
- [x] 6.2 Add 5 tests for read-only mode allowlisting in `n8n_download_blocker.test.ts`
- [x] 6.3 All 15 download blocker tests pass
- [x] 6.4 Build hooks with `bun run build`

## Dependencies

- Tasks 1.1-1.2 depend on reading live workflow (3.1)
- Tasks 1.3-1.5 depend on 1.1-1.2 (code extraction)
- Section 2 is independent of Section 1
- Section 3 depends on Section 1 tests passing (1.5)
- Section 4 depends on Section 3 (workflow must be functional)
- Section 5 can run in parallel with any other section
- Section 6 was unplanned but critical (download blocker was overly restrictive)

## Parallelizable

- Sections 1 and 2 can run in parallel
- Tasks 2.3, 2.4, 2.5 can run in parallel
- Section 5 can run in parallel with everything

## 7. Architecture Pivot: Recursive Feedback Loop

- [x] 7.1 Create `test-runner.ts` with scientific method loop (Hypothesis, Experiment, Observation, Analysis, Refinement, Repeat, Record)
- [x] 7.2 Implement `loadScenarios()` to read from `test-profile.json` with category filtering, fallback to defaults
- [x] 7.3 Implement `runSimulation()` with correct simulate_conversation request body (`simulation_specification.simulated_user_config.prompt = {prompt, llm, temperature}`)
- [x] 7.4 Implement response transformation: `conversation_history` + `evaluation_results` -> `simulated_conversation` + `analysis.evaluation_criteria_results`
- [x] 7.5 Implement `createTest()` with correct Tests API body (`chat_history[].time_in_call_secs`, examples as `{response, type}` objects)
- [x] 7.6 Implement `runTests()` to execute tests via Tests API
- [x] 7.7 Implement `analyzeIteration()` using existing `analyzeResults()` from `analyze-results.js`
- [x] 7.8 Implement `generateRecommendations()` with CRITICAL/MODERATE/OK levels
- [x] 7.9 Implement `recordResult()` writing to `test-run-registry.json` using object key access (not array)
- [x] 7.10 Implement convergence detection (stop when aggregate_score >= threshold)
- [x] 7.11 Implement CLI args: `--dry-run`, `--max-iterations N`, `--category CAT`
- [x] 7.12 Dry run validation passes (loads 10 scenarios, 3 iterations, all phases execute)

## 8. Test Runner Unit Tests

- [x] 8.1 Create `test-runner.test.ts` with 18 Vitest tests
- [x] 8.2 Scenario loading tests (3): file exists, required fields, correct IDs
- [x] 8.3 Analysis pipeline tests (4): success scoring, failure scoring, null response, aggregation
- [x] 8.4 Recommendation generation tests (3): critical, moderate, Tests API failures
- [x] 8.5 Report generation tests (3): aggregated results, Excellent rating, Needs Improvement
- [x] 8.6 Convergence logic tests (3): threshold stop, full iteration, pass rate calculation
- [x] 8.7 Input hash uniqueness tests (2): different hashes, same hash
- [x] 8.8 All 18 tests pass (`bun test ./tests/code-nodes/voice-agent-tester/test-runner.test.ts`)

## 9. API Bug Fixes

- [x] 9.1 Fix simulate_conversation 500: restructured `simulated_user_config` to nested `prompt` object
- [x] 9.2 Fix Tests API 422: added `time_in_call_secs: 0` to `chat_history`
- [x] 9.3 Fix Tests API 422: changed examples from strings to `{response, type}` objects
- [x] 9.4 Fix registry access: changed from `registry.entities.find()` to `registry["entity-key"]`
- [x] 9.5 Fix LLM model: changed banned model to `gemini-3-flash-preview`
- [x] 9.6 Fix `entity.primordialRuns` -> `entity.testRuns` in log message
- [x] 9.7 Fix duplicate `name` field in `createTest()` body
- [x] 9.8 Fix test-runner.test.ts: `performance_rating` -> `performance` field name

## 10. Live API Validation (NEXT)

- [ ] 10.1 Run `bun run tests/code-nodes/voice-agent-tester/test-runner.ts --max-iterations 1 --category happy_path`
- [ ] 10.2 If simulate_conversation still 500: try omitting `llm`/`temperature` or use `gpt-5.2`
- [ ] 10.3 If Tests API still 422: add `content: scenario.prompt` to `chat_history` entries
- [ ] 10.4 Verify at least 1 scenario passes end-to-end

## 11. Primordial Pipeline

- [ ] 11.1 (same as 4.2) Execute primordial pipeline run 1 with novel input data
- [ ] 11.2 (same as 4.3) Execute primordial pipeline run 2 with novel input data
- [ ] 11.3 (same as 4.4) Execute primordial pipeline run 3 with novel input data
- [ ] 11.4 (same as 4.5) Verify registry has 3 entries with unique SHA-256 `inputHash` values

## 12. [DEV] Tag Removal

- [ ] 12.1 Verify 98%+ success rate across primordial runs
- [ ] 12.2 Remove [DEV] tag from workflow `uShlKp2CxOsp0ubC`
- [ ] 12.3 Update registry status to "healthy"

## Remaining (requires live API coordination)

- 3.8: Smoke test with live ElevenLabs API (subsumed by 10.1)
- 4.2-4.5: Primordial pipeline runs (subsumed by 11.1-11.4)
- 10.1-10.4: Live API validation (NEXT priority)
- 11.1-11.4: Primordial pipeline (after live validation)
- 12.1-12.3: [DEV] tag removal (after primordial complete)
