# Design: Cloud Object Creation Gate

## Architecture

The hook sits in `hooks/src/governance/` alongside existing governance hooks. It runs as a PreToolUse hook with a broad matcher covering all cloud-creating MCP tools.

### Matcher Pattern

```
mcp__n8n-mcp__n8n_create_workflow|mcp__n8n-mcp__n8n_update_workflow|mcp__elevenlabs__.*|mcp__servicetitan__.*
```

Note: `update_workflow` is included because pushing untested changes to cloud is equally dangerous.

### Check Sequence

Checks run in priority order; first failure blocks:

1. **PROJECT-DIRECTIVE.md** -- Walk up from `process.cwd()` looking for `PROJECT-DIRECTIVE.md`. If not found, BLOCK.
2. **Spec file** -- Derive entity name from tool input (workflow name, agent name). Look for matching spec under `specs/` or `hooks/specs/`. If not found, BLOCK.
3. **Test-run-registry** -- Read `~/.claude/ledger/test-run-registry.json`. Find entries matching entity name with 3+ novel runs (distinct SHA-256 hashes). If insufficient, BLOCK.
4. **Local files** -- Check for local workflow JSON / code files. If no local artifact exists, BLOCK.

### Entity Name Extraction

| Tool Pattern | Entity Name Source |
|---|---|
| `n8n_create_workflow` | `tool_input.name` or `tool_input.workflow.name` |
| `n8n_update_workflow` | `tool_input.name` or `tool_input.workflow.name` |
| `elevenlabs__*` | `tool_input.name` or `tool_input.agent_name` |
| `servicetitan__*` | `tool_input.name` or first string field |

### Bypass Mechanism

An environment variable `CLOUD_GATE_BYPASS=1` allows emergency bypass (logged as warning). This exists for genuine emergency deployments.

### Interaction with Existing Hooks

This hook runs BEFORE content-validation hooks (naming, notes, linting) in the settings.json ordering. If the creation gate blocks, content validators never fire -- saving unnecessary processing.

## Trade-offs

| Decision | Rationale |
|---|---|
| Single hook vs per-system | Single hook avoids duplication; system-specific logic is minimal (entity name extraction) |
| Fail-closed | Missing registry/spec = BLOCK. Safer default for P0-CRITICAL |
| Regex matcher includes update | Pushing untested updates is same risk as untested creates |
