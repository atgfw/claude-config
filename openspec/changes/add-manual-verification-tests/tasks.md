# Tasks: Manual Verification Tests for Session Re-initialization

## Goal

Complete the OpenSpec change `add-manual-verification-tests` by creating test documentation, setup scripts, and execution registry for the 5 session re-initialization features.

**Change ID:** `add-manual-verification-tests`

## Phase 1: Infrastructure Setup

- [x] 1.1 Create `docs/manual-tests/session-reinit/` directory
- [x] 1.2 Create `scripts/test-setup/session-reinit/` directory
- [x] 1.3 Create `ledger/manual-test-registry.json` with schema

## Phase 2: Setup Scripts (TypeScript/Bun)

- [x] 2.1 Create `setup-dirty-tree.ts` - Creates uncommitted changes, fetches remote
- [x] 2.2 Create `setup-governance-violation.ts` - Creates .mcp.json in test project
- [x] 2.3 Create `setup-stale-hooks.ts` - Touches src/*.ts to be newer than dist/*.js
- [x] 2.4 Create `setup-temp-files.ts` - Creates *.tmp files with old timestamps
- [x] 2.5 Create `setup-drift.ts` - Creates workflow JSON with mismatched name (fixed: uses workflows/ dir)
- [x] 2.6 Create `cleanup-all.ts` - Reverts all test conditions

## Phase 3: Test Documentation

- [x] 3.1 Write `README.md` with overview and cross-platform notes
- [x] 3.2 Write `01-dirty-tree-detection.md` - Git sync warning test
- [x] 3.3 Write `02-governance-block.md` - Child project validation test
- [x] 3.4 Write `03-self-heal.md` - Hook compilation recovery test
- [x] 3.5 Write `04-cleanup.md` - Stale file archival test
- [x] 3.6 Write `05-documentation-drift.md` - Workflow name mismatch test

## Phase 4: Test Execution (Windows)

- [x] 4.1 Execute dirty tree detection test, record in registry
- [x] 4.2 Execute governance block test, record in registry
- [x] 4.3 Execute self-heal test, record in registry
- [x] 4.4 Execute cleanup test, record in registry
- [x] 4.5 Execute documentation drift test, record in registry

## Phase 5: Validation

- [x] 5.1 Run `openspec validate add-manual-verification-tests --strict`
- [x] 5.2 Verify all setup scripts run without errors
- [x] 5.3 Document any edge cases discovered
  - Edge case: setup-drift.ts was creating files in temp/, but drift checker looks in workflows/. Fixed.
  - Edge case: dirty tree + behind remote requires manual remote push to fully test

## Phase 6: Cross-Platform (Optional)

- [ ] 6.1 Verify scripts work on Linux (if available)
- [ ] 6.2 Verify scripts work on Mac (if available)
- [ ] 6.3 Document platform-specific differences

## Dependencies

- Requires `bun` runtime for script execution
- Requires test project directory (temp clone recommended)
- Requires git repository with remote configured
