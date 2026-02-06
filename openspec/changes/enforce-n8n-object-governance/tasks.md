## 1. Naming Convention Enforcement

- [x] 1.1 Create `n8n_naming_validator.ts` hook scaffold with TDD test file
- [x] 1.2 Implement tag syntax detection (block `[TAG]` when system has native tags)
- [x] 1.3 Implement version number detection (block `v1`, `v2`, `r1`, `r2` patterns)
- [x] 1.4 Implement snake_case validation for node names
- [x] 1.5 Implement integer-in-name detection (global rule)
- [x] 1.6 Add system name prefix validation (suggest `ServiceTitan_` not `[ST]`)
- [x] 1.7 Register hook in settings.json with PreToolUse event
- [x] 1.8 Write integration tests for all naming scenarios

## 2. Node Documentation Enforcement

- [x] 2.1 Create `n8n_node_note_validator.ts` hook scaffold with TDD test file
- [x] 2.2 Implement note presence detection (all nodes must have notes)
- [x] 2.3 Implement note substance validation (minimum 20 characters, no placeholders)
- [x] 2.4 Implement "Display Note in Flow?" setting validation
- [x] 2.5 Register hook in settings.json with PreToolUse event
- [x] 2.6 Write integration tests for documentation scenarios

## 3. Code Node Governance

- [x] 3.1 Create `code_node_linting_gate.ts` hook scaffold with TDD test file
- [x] 3.2 Implement JavaScript extraction from code node payloads
- [x] 3.3 Integrate with simplified linting rules for code node content
- [x] 3.4 Define n8n-specific linting exceptions (document rationale)
- [ ] 3.5 Extend existing `code_node_test_validator` to enforce local testing (deferred - requires test registry integration)
- [ ] 3.6 Implement mock data requirement detection (deferred - requires test registry integration)
- [x] 3.7 Register hook in settings.json with PreToolUse event
- [x] 3.8 Write integration tests for linting scenarios

## 4. Tool Preference Hierarchy

- [x] 4.1 Add `cloud-object-modify` route to tool-router.json with exact tool names
- [x] 4.2 Add `local-object-modify` route to tool-router.json with exact tool names
- [x] 4.3 Add `adhoc-code-execute` route to tool-router.json with exact tool names
- [x] 4.4 Add `frameworkExceptions` map to tool-router.json (scrapling: python, etc.)
- [x] 4.5 Document preference chain rationale in tool-router README
- [ ] 4.6 Test route selection logic with MCP health variations (deferred - runtime testing)
- [ ] 4.7 Test framework exception logic (Python allowed for Scrapling) (deferred - runtime testing)

## 5. Update CLAUDE.md

- [x] 5.1 Add naming convention rules to Critical Rules table
- [x] 5.2 Add node documentation rules to n8n section
- [x] 5.3 Add code node governance section
- [x] 5.4 Add tool preference hierarchy tables to Dynamic Tool Router section (exact tool names)
- [x] 5.5 Add Framework Exceptions table with rationale
- [x] 5.6 Update Governance Hooks table
- [x] 5.7 Verify CLAUDE.md tool names match tool-router.json exactly

## 6. Hook Documentation Alignment

- [x] 6.1 Update hook JSDoc comments to reference hooks/docs/ (updated by slim-claudemd-to-governance-index)
- [x] 6.2 Ensure hook error messages reference correct tool names from hierarchy
- [x] 6.3 Add hook description field in settings.json linking to CLAUDE.md
- [x] 6.4 Verify all hook descriptions use same terminology as CLAUDE.md

## 7. Validation and Testing

- [x] 7.1 Run all Vitest tests to confirm no regressions (87 tests passed)
- [x] 7.2 Test hooks against sample n8n workflow payloads (via test suite)
- [x] 7.3 Verify warn-only mode for existing workflows (implemented in hook logic)
- [x] 7.4 Verify CLAUDE.md and tool-router.json are in sync
- [x] 7.5 Run `openspec validate enforce-n8n-object-governance --strict` (PASSED)

---

## Deferred Items - Architecture Notes

### 3.5 & 3.6: Code Node Local Testing Enforcement

**Status:** Deferred - requires architectural decision

**Challenge:** Correlating code node content uploaded to n8n with local test runs in test-run-registry.

**Current state:**
- `code_node_test_validator.ts` validates test FILE structure (Vitest, fixtures)
- `code_node_linting_gate.ts` validates code CONTENT quality
- `test_run_registry.ts` tracks test runs by entity path

**Gap:** No correlation between n8n code node content and registered test entities

**Proposed architecture:**
1. When writing code to `tests/code-nodes/` directory, register entity in test-run-registry with code hash
2. When test runs pass, update entity status with passing hash
3. When uploading to n8n, hash code node content and check if hash exists in registry as healthy
4. Block upload if code hash not found or entity not healthy

**Implementation path:**
1. Add `codeHash` tracking to test_run_registry.ts entity records
2. Extend code_node_test_validator to register entities on test file creation
3. Create post-test hook to record test results to registry
4. Extend code_node_linting_gate to check registry for code hash health
5. Add tests for hash correlation

### 4.6 & 4.7: Route Selection Runtime Testing

**Status:** Deferred - requires runtime testing environment

**Challenge:** Testing MCP health variations requires manually disabling MCPs or mocking health checks.

**Testing approach:**
1. Unit test: Mock MCP health check responses, verify correct tool selection
2. Integration test: Actually disable MCPs, verify fallback works
3. Manual verification: Document test scenarios in README

**Why deferred:** Testing framework exceptions (Python for Scrapling) requires runtime execution and is better done during actual usage validation rather than automated testing.
