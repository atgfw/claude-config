## Context

The session_start hook currently handles:
- Environment setup (.env creation/loading)
- Prerequisites check (Node.js, npx, Claude CLI)
- MCP server health check
- Subagent availability
- API key synchronization
- Correction ledger status
- Escalation status

It does NOT handle:
- Git state synchronization
- Project cleanup
- Documentation validation
- Child project governance enforcement

This change extends session_start to be a comprehensive project reinitialization system.

## Goals / Non-Goals

**Goals:**
- Automate git pull/sync with intelligent conflict detection
- Clean stale files (move to old/, never delete)
- Validate documentation matches implementation
- Enforce governance rules before any work begins
- Reduce human interventions for routine maintenance

**Non-Goals:**
- Automatic conflict resolution
- Documentation auto-generation
- Blocking on every warning (only strict rules block)
- Changing git history or force operations

## Decisions

### Decision 1: Git Operations Architecture

**What**: Create a separate `git_sync.ts` module for git operations
**Why**: Separation of concerns, testable, reusable
**Alternatives considered**:
- Inline in session_start.ts - rejected (too complex, hard to test)
- External git hook - rejected (must integrate with Claude Code session)

### Decision 2: Conflict Detection Algorithm

**What**: Use `git fetch` + `git status` + `git diff` to detect conflicts
**Why**: Non-destructive, works with any git state
**Implementation**:
```typescript
interface GitSyncResult {
  status: 'up-to-date' | 'behind' | 'ahead' | 'diverged';
  localChanges: boolean;
  behindCount: number;
  aheadCount: number;
  conflicts: string[]; // Files that would conflict
  recommendation: 'auto-pull' | 'warn-user' | 'manual-required';
}
```

### Decision 3: Cleanup File Selection

**What**: Pattern-based selection with age threshold
**Why**: Predictable, auditable, safe
**Patterns**:
```typescript
const CLEANUP_PATTERNS = [
  { glob: '**/*.tmp', maxAgeDays: 1 },
  { glob: '**/*.bak', maxAgeDays: 7 },
  { glob: '**/*.log', maxAgeDays: 3, exclude: ['git.log'] },
  { glob: '**/node_modules/.cache/**', maxAgeDays: 7 },
  { glob: '**/dist/**/*.map', maxAgeDays: 30 },
];
```

### Decision 4: Governance Check Severity Levels

**What**: STRICT blocks session, WARN allows continuation
**Why**: Balance safety with usability

| Check | Severity | Failure Action |
|-------|----------|----------------|
| Child project isolation | STRICT | Block until resolved |
| Hook compilation | STRICT | Attempt self-heal, then block |
| MCP health | WARN | Log, continue |
| Documentation drift | WARN | Log, continue |

### Decision 5: Self-Healing for Hook Compilation

**What**: Auto-recompile hooks if source newer than dist
**Why**: Common failure mode, easy to fix automatically
**Implementation**:
```bash
cd ~/.claude/hooks && bun run build
```

## Risks / Trade-offs

### Risk: Auto-pull could break working state
**Mitigation**: Only auto-pull if clean working tree AND no divergence

### Risk: Cleanup could move important files
**Mitigation**:
- Conservative patterns only
- Always move to `old/`, never delete
- Log all moves with full path

### Risk: Git operations slow on large repos
**Mitigation**:
- Use `--depth=1` for fetch where possible
- Timeout after 30 seconds, warn but continue
- Cache fetch results for 15 minutes

### Risk: Governance block could be frustrating
**Mitigation**:
- Clear error messages with remediation steps
- Self-heal where possible
- Only block for truly critical issues

## Migration Plan

1. **Phase 1**: Add git sync module (warn only, no auto-pull)
2. **Phase 2**: Add cleanup module (conservative patterns)
3. **Phase 3**: Add governance checks
4. **Phase 4**: Enable auto-pull for clean working trees
5. **Phase 5**: Tune patterns based on real usage

Rollback: Each phase can be disabled via configuration in settings.json.

## Open Questions

1. Should auto-pull use rebase or merge?
   - Proposal: merge (safer, preserves history)

2. How long should files stay in `old/` before permanent removal?
   - Proposal: Never auto-remove from `old/`, manual cleanup only

3. Should we support project-specific governance overrides?
   - Proposal: No - violates spinal cord authority principle
