# Change: Add Manual Verification Tests for Session Re-initialization

**Change ID:** `add-manual-verification-tests`
**Status:** Draft
**Created:** 2026-02-05
**GitHub Issue:** #18
**Parent Change:** `add-project-open-reinit`

## Summary

Create a comprehensive manual verification test suite for the 5 session re-initialization features implemented in `add-project-open-reinit`. Tests include setup scripts to create test conditions, step-by-step verification procedures, and a registry to track cross-platform test execution.

## Why

The session re-initialization features (dirty tree detection, governance block, self-heal, cleanup, documentation drift) are implemented with unit tests, but have not been validated end-to-end in real Claude Code sessions.

**Unit tests cannot verify:**
- Hook output formatting in Claude Code UI
- Cross-platform behavior (Windows/Linux/Mac path handling)
- Self-healing recovery flows
- User-facing warning messages

**Current state:**
- 5 session features implemented in `hooks/src/session/`
- Unit tests exist in `hooks/tests/`
- No manual verification performed
- No cross-platform testing documented

**Desired state:**
- Each feature has documented manual test procedure
- Setup scripts create reproducible test conditions
- Test executions tracked in registry with platform info
- Edge cases discovered and documented

## What Changes

- **ADDED** Manual test documentation for 5 session features (`docs/manual-tests/session-reinit/`)
- **ADDED** Setup scripts (TypeScript/Bun) to create test conditions (`scripts/test-setup/session-reinit/`)
- **ADDED** Manual test registry for execution tracking (`ledger/manual-test-registry.json`)
- **ADDED** New `manual-verification` capability spec

## Impact

- Affected specs: `manual-verification` (new capability)
- Affected code: None (documentation and scripts only)
- New files: ~15 files (6 test docs, 6 scripts, 1 registry, 2 OpenSpec files)

## User Decisions

| Decision | Choice |
|----------|--------|
| Test location | `docs/manual-tests/session-reinit/` |
| Script language | TypeScript (matches hooks codebase) |
| Registry format | JSON matching test-run-registry.json pattern |
| Platform priority | Windows (primary), Linux/Mac (secondary) |

## Success Criteria

1. All 5 features have documented test procedures with exact expected output
2. Setup scripts work on Windows (bun runtime)
3. `openspec validate add-manual-verification-tests --strict` passes
4. Registry schema supports tracking executions by platform
