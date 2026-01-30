# Change: Add Project Open Reinitialization to Session Start Hook

## Why

When Claude Code opens a project, the current session_start hook only handles MCP server health and API key syncing. It does not reinitialize the project state - leaving stale files, outdated remote changes, and governance violations undetected until they cause problems mid-session.

Every human intervention to "pull latest", "clean up files", or "fix governance violations" represents a failure that should have been automated.

## What Changes

- **ADDED** Git synchronization on project open
  - Fetch remote changes
  - Detect conflicts between local uncommitted work and remote
  - Warn with comparison when overwrite would occur
  - Optionally auto-pull if clean working tree

- **ADDED** Project cleanup (reclean) operations
  - Move stale temp files to `old/` directory (deletion banned)
  - Clean cache directories
  - Validate project structure

- **ADDED** Documentation drift detection
  - Compare CLAUDE.md, README.md against implementation
  - Warn when documentation doesn't match code behavior

- **ADDED** Comprehensive governance compliance check
  - Child project isolation validation (no local .mcp.json, hooks, settings.json)
  - Hook compilation status verification
  - MCP health (existing, enhanced)
  - All governance hooks validated

## Impact

- Affected specs: `session-start` (new capability)
- Affected code: `hooks/src/hooks/session_start.ts`
- New files: Potential helper modules for git operations, cleanup, governance

## Design Considerations

### Git Synchronization Strategy

1. **Fetch First**: Always fetch to get latest remote state without changing local
2. **Compare**: Check if local HEAD differs from origin/main (or default branch)
3. **Conflict Detection**: If uncommitted changes exist AND remote has new commits, warn
4. **Decision Tree**:
   - Clean working tree + behind remote -> Auto-pull
   - Dirty working tree + behind remote -> Warn, show diff stats, ask for decision
   - Already up to date -> Continue silently

### Overwrite Warning Logic

When local uncommitted changes conflict with remote:
```
[WARN] Remote has 3 new commits. Local has uncommitted changes.

Remote changes:
  - feat: add user auth (remote)
  - fix: login redirect (remote)

Local uncommitted:
  - M src/auth.ts (12 lines changed)
  - M README.md (3 lines changed)

Potential conflicts detected in: src/auth.ts

Actions:
  1. Stash local, pull, then unstash (may require merge)
  2. Continue with local (remote changes not integrated)
  3. Abort and resolve manually
```

### Cleanup Strategy (Deletion Banned)

Per CLAUDE.md rules, files are never deleted - they're moved to `old/`:

1. Identify stale files:
   - `*.tmp`, `*.bak`, `*.log` older than 24 hours
   - Empty directories
   - Build artifacts not in `.gitignore`
2. Move to `project/old/YYYY-MM-DD/` with original path preserved
3. Log moved files for audit trail

### Governance Check Sequence

1. **Child Project Isolation** (STRICT - blocks on failure)
   - No `.mcp.json` in project root
   - No `hooks/` directory in project
   - No `settings.json` in project
   - No `.env` in project (must be in ~/.claude/.env)

2. **Hook Compilation** (STRICT - attempts self-heal)
   - All TypeScript hooks compiled to dist/
   - No compilation errors
   - Timestamps match (source not newer than dist)

3. **MCP Health** (existing - WARN on failure)
   - All configured servers responsive
   - API keys present and valid

4. **Documentation Drift** (WARN only)
   - Key CLAUDE.md rules still enforced by hooks
   - README reflects actual project structure

## Non-Goals

- Automatic merge conflict resolution (too risky)
- Deleting files (banned by CLAUDE.md)
- Modifying documentation automatically (only warn)
- Blocking session on warnings (only strict governance blocks)
