# Manual Verification Tests: Session Re-initialization

## Goal

Verify that the 5 session re-initialization features work correctly in real Claude Code sessions.

## Overview

These manual tests validate features that cannot be fully tested through unit tests:
- UI output formatting in Claude Code
- Cross-platform behavior
- Self-healing recovery flows
- User-facing warning messages

## Test Index

| # | Test | Feature | Hook File |
|---|------|---------|-----------|
| 01 | Dirty Tree Detection | Git sync warning | `hooks/src/session/git_synchronizer.ts` |
| 02 | Governance Block | Child project validation | `hooks/src/session/child_project_validator.ts` |
| 03 | Self-Heal | Hook compilation recovery | `hooks/src/session/hook_compilation_validator.ts` |
| 04 | Cleanup | Stale file archival | `hooks/src/session/project_cleanup.ts` |
| 05 | Documentation Drift | Workflow name mismatch | `hooks/src/session/documentation_drift_checker.ts` |

## Prerequisites

- Bun runtime installed (`bun --version`)
- Git configured with remote repository
- Clone of ~/.claude for isolated testing (recommended)

## Setup Scripts

Setup scripts are located in `scripts/test-setup/session-reinit/`:

```bash
# Create test conditions
bun run scripts/test-setup/session-reinit/setup-dirty-tree.ts
bun run scripts/test-setup/session-reinit/setup-governance-violation.ts
bun run scripts/test-setup/session-reinit/setup-stale-hooks.ts
bun run scripts/test-setup/session-reinit/setup-temp-files.ts
bun run scripts/test-setup/session-reinit/setup-drift.ts

# Reset all test conditions
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

## Recording Results

After executing tests, record results in `ledger/manual-test-registry.json`:

```json
{
  "executor": "your-name",
  "platform": "win32",
  "timestamp": "2026-02-05",
  "result": "pass",
  "notes": "Description of what was observed",
  "edgeCases": ["Any unexpected behaviors"]
}
```

## Cross-Platform Notes

### Windows (Primary)
- All scripts tested on Windows
- Path handling uses `path.join()` for compatibility

### Linux/Mac (Secondary)
- May require `chmod +x` for some operations
- File permission tests may behave differently
