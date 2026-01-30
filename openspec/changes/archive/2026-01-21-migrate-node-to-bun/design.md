# Design: Node.js to Bun Runtime Migration

## Context

The Spinal Cord hook system currently uses Node.js as its runtime. Hooks are invoked via complex `node -e` commands in settings.json for every tool use, making startup latency a critical performance factor.

**Current architecture:**
```
Claude Code -> settings.json -> node -e "..." -> dist/cli.js -> hook logic
```

**Stakeholders:**
- Claude Code CLI (consumer of hooks)
- All child projects (inherit hook enforcement)
- MCP servers (use npm/npx for recovery)

## Goals / Non-Goals

**Goals:**
- Reduce hook invocation latency by >50%
- Eliminate TypeScript compilation requirement for development
- Maintain 100% compatibility with existing hook logic
- Preserve all MCP server functionality
- Enable faster iteration on hook development

**Non-Goals:**
- Rewriting hooks to use Bun-specific APIs
- Changing the hook architecture or interfaces
- Migrating MCP servers themselves to Bun
- Supporting dual runtime (Node + Bun simultaneously)

## Decisions

### Decision 1: Full Bun Migration (Not Gradual)

**What:** Migrate all Node.js invocations to Bun in a single coordinated change.

**Why:** The hook system is tightly coupled - partial migration would require maintaining two runtimes and increase complexity. Bun's Node.js compatibility layer means existing code works unchanged.

**Alternatives considered:**
- Gradual migration (hook by hook): Rejected - introduces dual-runtime maintenance burden
- Keep Node.js: Rejected - misses significant performance opportunity

### Decision 2: Preserve npm Compatibility Layer

**What:** Use `bun` for runtime but maintain `npm`/`npx` compatibility for MCP server management.

**Why:** MCP servers are published to npm registry. Bun can run npx commands via its compatibility layer (`bun x`), but using native npm for MCP operations avoids potential edge cases.

**Alternatives considered:**
- Full bunx migration: Rejected - MCP ecosystem expects npm
- Hybrid approach: Selected - bun for hooks, npm for MCP

### Decision 3: Direct TypeScript Execution

**What:** Leverage Bun's native TypeScript support to run `.ts` files directly, optionally eliminating the `tsc` build step.

**Why:** Bun transpiles TypeScript on-the-fly with near-zero overhead. This simplifies development workflow.

**Implementation note:** Keep `dist/` compilation for now to ensure backward compatibility. Can be removed in future iteration after validation.

### Decision 4: Vitest Under Bun

**What:** Run Vitest tests using Bun runtime by setting `environment: 'bun'` in vitest.config.ts.

**Why:** Ensures tests reflect production runtime behavior. Bun's Vitest integration is mature.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Bun Windows support maturity | Validate all hooks on Windows before cutover; Bun 1.0+ has production Windows support |
| npm package compatibility | Audit all dependencies; Bun supports 99%+ of npm packages |
| Breaking existing workflows | Provide clear migration path; validate all hooks before deployment |
| Future Bun breaking changes | Pin Bun version in documentation; test on upgrade |

## Migration Plan

### Phase 1: Preparation
1. Install Bun globally on development machine
2. Validate Bun version requirements
3. Test each hook individually under Bun
4. Document any compatibility issues

### Phase 2: Configuration Migration
1. Update settings.json hook commands (node -> bun)
2. Update package.json scripts
3. Update vitest.config.ts environment
4. Update mcp-registry.json recovery procedures
5. Generate bun.lockb from existing dependencies

### Phase 3: Validation
1. Run full test suite under Bun
2. Execute each hook type manually
3. Verify MCP server health checks
4. Test session start flow end-to-end
5. Benchmark latency improvements

### Phase 4: Documentation
1. Update CLAUDE.md references
2. Update project.md tech stack
3. Update setup.sh for Bun installation
4. Archive package-lock.json (move to old/)

### Rollback Plan
If critical issues discovered:
1. Revert settings.json to use `node`
2. Revert package.json scripts to `npm`
3. Restore package-lock.json from old/
4. Document issues for future attempt

## Open Questions

1. **Bun version pinning**: Should we enforce a minimum Bun version? Recommendation: Yes, pin to 1.1.0+ for Windows stability.

2. **Direct TS execution**: Should we skip compilation entirely? Recommendation: Keep dist/ for now, evaluate removal separately.

3. **bunx vs npx for MCP**: Some MCP recovery procedures use `npx`. Test if `bunx` works as drop-in replacement.
