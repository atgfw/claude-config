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

## Remaining (requires live API coordination)

- 3.8: Smoke test with live ElevenLabs API
- 4.2-4.5: Primordial pipeline runs (3 novel inputs required)
