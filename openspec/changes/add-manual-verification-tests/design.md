# Design: Manual Verification Test Framework

## Goal

Establish a framework for documenting and tracking manual verification tests for session re-initialization features that cannot be validated through unit tests alone.

## Context

Session re-initialization features require manual verification because:
1. Unit tests cannot verify Claude Code UI output formatting
2. Hook behavior varies based on real filesystem state
3. Cross-platform compatibility needs empirical validation
4. Self-healing behaviors need observation in real sessions

## Goals

- Establish repeatable manual test procedures
- Create setup scripts that configure test conditions
- Track test executions with platform metadata
- Discover edge cases through real-world testing

## Non-Goals

- Full automation (defeats purpose of manual verification)
- CI/CD integration (manual tests are run ad-hoc)
- Performance benchmarking

## Decisions

### Decision 1: Test Location

**Choice:** `docs/manual-tests/session-reinit/`

**Rationale:** Keeps test documentation separate from code, discoverable via docs/.

**Alternatives considered:**
- `hooks/tests/manual/` - Rejected: mixes with unit tests
- `openspec/tests/` - Rejected: OpenSpec is for specs, not tests

### Decision 2: Script Language

**Choice:** TypeScript with Bun runtime

**Rationale:** Matches hooks codebase, cross-platform, type-safe.

**Alternatives considered:**
- Shell scripts - Rejected: Windows compatibility issues
- Python - Rejected: doesn't match project stack

### Decision 3: Registry Schema

**Choice:** JSON format matching `test-run-registry.json` pattern

```json
{
  "manualTests": {
    "session-reinit/dirty-tree-detection": {
      "testId": "session-reinit/dirty-tree-detection",
      "feature": "Git Synchronization",
      "hookFile": "hooks/src/session/git_synchronizer.ts",
      "executions": [
        {
          "executor": "human",
          "platform": "win32",
          "timestamp": "2026-02-05",
          "result": "pass",
          "notes": "Warning displayed correctly",
          "edgeCases": []
        }
      ]
    }
  },
  "lastUpdated": "2026-02-05"
}
```

### Decision 4: Test Isolation

**Choice:** Use isolated test project directory, not ~/.claude

**Rationale:** Avoids corrupting real spinal cord during testing. Setup scripts create conditions in a temp project clone.

## Test Procedure Template

Each test document follows this structure:

1. **Feature Under Test** - Link to implementation file
2. **Prerequisites** - What must be true before testing
3. **Setup Command** - Script to run for test setup
4. **Test Steps** - Numbered actions to perform
5. **Expected Output** - Exact strings to verify
6. **Verification Checklist** - Items to confirm
7. **Cleanup Command** - How to reset state
8. **Edge Cases** - Variations to try

## Platform Considerations

### Windows (Primary)
- Path separator: handled by Node path.join()
- File timestamps: NTFS precision is 100ns
- Git: Requires Git for Windows

### Linux/Mac (Secondary)
- Path separator: forward slash
- File permissions: May need chmod for test scenarios

### Cross-Platform Script Pattern
```typescript
import * as path from 'node:path';
import * as os from 'node:os';

const isWindows = os.platform() === 'win32';
// Always use path.join() for all paths
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Setup scripts damage real project | Use isolated test directory |
| Tests are platform-specific | Document differences, use path.join() |
| Test results are subjective | Provide exact expected output strings |
| Edge cases not discovered | Encourage testers to document anomalies |
