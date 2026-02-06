# Tasks: Add Voice Agent Testing Engine

## 1. Local Vitest Test Suite

- [ ] 1.1 Extract `parse-simulation-response` code node logic from Voice Agent Tester workflow (`IZIj5oh3VwCVJb34`) into `tests/code-nodes/voice-agent-tester/parse-simulation-response.js`
- [ ] 1.2 Extract `generate-report` code node logic into `tests/code-nodes/voice-agent-tester/generate-report.js`
- [ ] 1.3 Write `tests/code-nodes/voice-agent-tester/parse-simulation-response.test.ts` with tests for: valid response parsing, tool call extraction, missing/malformed data handling, empty transcript
- [ ] 1.4 Write `tests/code-nodes/voice-agent-tester/generate-report.test.ts` with tests for: multi-scenario aggregation, per-category breakdown, success rate calculation, edge cases (0 scenarios, all pass, all fail)
- [ ] 1.5 Run `bun test tests/code-nodes/voice-agent-tester/` and verify all tests pass

## 2. JSON Test Profile

- [ ] 2.1 Create `workflows/voice_ai_agents/test-fixtures/` directory
- [ ] 2.2 Create `test-profile.json` with `meta` block (workflow ID, version, test count) and `test_cases` array
- [ ] 2.3 Port all 10 YAML scenarios into JSON test case format with inputs, expected tool calls, and evaluation criteria
- [ ] 2.4 Add transformation test cases (conversation export to webhook format schema mapping)
- [ ] 2.5 Add integration test case definitions (tester-to-reprocessor pipeline)

## 3. Workflow Enhancement

- [ ] 3.1 Read current Voice Agent Tester workflow state via `mcp__n8n-mcp__n8n_get_workflow`
- [ ] 3.2 Add `load_scenarios` code node that reads YAML and returns all 10 scenarios (or filtered by category parameter)
- [ ] 3.3 Add `route_by_category` switch node to enable category-filtered execution
- [ ] 3.4 Enhance `generate_report` node for per-scenario breakdown with evaluation criteria verdicts and overall success rate
- [ ] 3.5 Add `executeWorkflowTrigger` for dual-trigger pattern compliance
- [ ] 3.6 Push updates via `mcp__n8n-mcp__n8n_update_partial_workflow`
- [ ] 3.7 Smoke test: trigger workflow via n8n-MCP and verify all 10 scenarios execute

## 4. Governance Integration

- [ ] 4.1 Add `voice-agent-tester` entity to `ledger/test-run-registry.json`
- [ ] 4.2 Execute primordial pipeline run 1 with novel input data
- [ ] 4.3 Execute primordial pipeline run 2 with novel input data
- [ ] 4.4 Execute primordial pipeline run 3 with novel input data
- [ ] 4.5 Verify registry has 3 entries with unique SHA-256 `inputHash` values

## 5. Issue Lifecycle

- [ ] 5.1 Update issue #26 labels: move `lifecycle/triage` to `lifecycle/specced`
- [ ] 5.2 Add comment to issue #26 linking this OpenSpec change

## Dependencies

- Tasks 1.1-1.2 depend on reading workflow from n8n API (3.1)
- Tasks 1.3-1.5 depend on 1.1-1.2 (code extraction)
- Section 2 is independent of Section 1
- Section 3 depends on Section 1 tests passing (1.5)
- Section 4 depends on Section 3 (workflow must be functional)
- Section 5 can run in parallel with any other section

## Parallelizable

- Sections 1 and 2 can run in parallel
- Tasks 2.3, 2.4, 2.5 can run in parallel
- Section 5 can run in parallel with everything
