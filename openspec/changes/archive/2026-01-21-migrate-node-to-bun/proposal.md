# Change: Migrate Spinal Cord Runtime from Node.js to Bun

## Why

Claude Code hooks execute on every tool invocation, making startup latency critical. Bun offers 4-5x faster cold start than Node.js, native TypeScript execution (eliminating the compile step), and drop-in compatibility with existing npm packages. This migration directly improves the responsiveness of the entire Spinal Cord enforcement system.

## What Changes

- **BREAKING**: All hook invocations change from `node` to `bun` runtime
- **BREAKING**: Lock file changes from `package-lock.json` to `bun.lockb`
- settings.json: All 18+ hook commands updated to use `bun` instead of `node`
- statusline.js: Invocation changes to `bun`
- package.json: Scripts migrate from `npm` to `bun`, engines field updated
- vitest.config.ts: Test environment changes from `node` to `bun`
- mcp-registry.json: Recovery procedures updated for bun compatibility
- project.md: Runtime documentation updated
- CLAUDE.md: Tool router and execution hierarchy references updated

## Impact

- Affected specs: `runtime` (new capability)
- Affected code:
  - `~/.claude/settings.json` (hook invocations)
  - `~/.claude/hooks/package.json` (scripts, engines)
  - `~/.claude/hooks/vitest.config.ts` (test environment)
  - `~/.claude/hooks/tsconfig.json` (possible simplification)
  - `~/.claude/mcp/mcp-registry.json` (recovery procedures)
  - `~/.claude/openspec/project.md` (tech stack documentation)
  - `~/.claude/CLAUDE.md` (tool router documentation)
  - `~/.claude/statusline.js` (invocation)

## Success Criteria

1. All hooks execute successfully under Bun runtime
2. All Vitest tests pass under Bun runtime
3. Hook invocation latency reduced by >50%
4. No regressions in MCP server health checks
5. Backward compatibility maintained for any external scripts

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Package incompatibility | Low | High | Test all dependencies before migration |
| Windows-specific issues | Medium | Medium | Validate on Windows before cutover |
| MCP server conflicts | Low | Medium | Test each MCP recovery procedure |
| Vitest compatibility | Low | Low | Bun has native Vitest support |
