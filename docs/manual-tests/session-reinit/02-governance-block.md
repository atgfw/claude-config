# Test 02: Governance Block

## Goal

Verify that session start blocks when child project contains prohibited override files.

## Feature Under Test

- **File:** `hooks/src/session/child_project_validator.ts`
- **Function:** `validateChildProject()`
- **Severity:** STRICT (blocking)

## Prerequisites

- Test project directory (not ~/.claude itself)
- Write permissions to create files

## Setup Command

```bash
bun run scripts/test-setup/session-reinit/setup-governance-violation.ts
```

The setup script will:
1. Create `.mcp.json` in test project root
2. Report the violation created

## Test Steps

1. Run the setup script to create governance violation
2. Start a new Claude Code session in the test project
3. Observe that session is BLOCKED

## Expected Output

```
[X] Child Project Governance Violation

Prohibited files detected:
  - .mcp.json (MCP configuration must be in ~/.claude/)

Child projects MUST NOT override spinal cord configuration.
Move or delete these files to continue.

Session blocked. Resolve violations before proceeding.
```

## Verification Checklist

- [ ] Session is BLOCKED (not just warned)
- [ ] Error message identifies the specific file
- [ ] Error explains WHY it's prohibited
- [ ] Error provides remediation guidance
- [ ] Session cannot proceed until file is removed

## Cleanup Command

```bash
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

Or manually:
```bash
rm .mcp.json
```

## Edge Cases to Test

1. **Multiple violations**: Create .mcp.json AND hooks/ directory
   - Expected: All violations listed

2. **Nested .mcp.json**: Create in subdirectory
   - Expected: Should NOT be detected (only root matters)

3. **Empty .mcp.json**: Create file with no content
   - Expected: Still blocked (existence matters, not content)

## Prohibited Files Reference

| File | Reason |
|------|--------|
| `.mcp.json` | MCP config must be global |
| `.claude/settings.json` | Settings must be global |
| `.claude/hooks/` | Hooks must be global |
| `.claude/.env` | Secrets must be global |
