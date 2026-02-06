# Proposal: Tool Research Gate for Pre-Implementation Research

**Change ID:** `add-tool-research-gate`
**Status:** Draft
**Created:** 2026-01-21
**GitHub Issue:** #12

## Summary

Establish a governance hook and process that enforces research of existing tools before implementing automation wrappers. This prevents reinventing the wheel when established, well-maintained tools (measured by GitHub stars, npm downloads, etc.) already solve the problem.

## Motivation

**Problem discovered:** When building Scrapling wrappers, implementation proceeded without first checking for established tools like browser-use (75.8k stars). This represents wasted effort and technical debt.

**Root cause:** No process or hook enforces research before implementation.

**Current state:**
- No pre-implementation research requirement
- Tool selection is ad-hoc and undocumented
- Wheel reinvention occurs repeatedly
- No tracking of research decisions

**Desired state:**
- Research gate blocks new automation wrappers until research is documented
- Standard research checklist with GitHub stars, npm/pypi popularity
- Decision documentation explaining why existing tools were rejected or chosen
- Integration with correction ledger for tracking violations

## User Decisions

| Decision | Choice |
|----------|--------|
| Enforcement level | BLOCK (hard gate) for new wrappers |
| Research template | Mandatory before implementation |
| Star threshold | Warn if tools exist with >5k stars |
| Scope | Automation wrappers, integrations, utilities |

## Architecture

```
~/.claude/
    +-- hooks/src/governance/
    |   +-- tool_research_gate.ts       # NEW: Main hook
    |
    +-- hooks/src/research/
    |   +-- github_searcher.ts          # NEW: gh CLI wrapper
    |   +-- npm_searcher.ts             # NEW: npm search wrapper
    |   +-- research_template.ts        # NEW: Template generator
    |
    +-- ledger/
    |   +-- tool-research-registry.json # NEW: Research decisions
    |   +-- correction-ledger.json      # EXISTING: Track violations
    |
    +-- templates/
    |   +-- TOOL-RESEARCH.template.md   # NEW: Research doc template
```

## Capabilities (1 Spec Delta)

1. **tool-research** - Pre-implementation research gate with GitHub/npm discovery

## New Hooks (1)

| Hook | Event | Action |
|------|-------|--------|
| `tool_research_gate` | PreToolUse (Write) | BLOCK wrapper creation without research doc |

## Detection Patterns

The hook identifies new automation wrapper files by:

1. **Path patterns:**
   - `**/wrappers/**/*.ts`
   - `**/integrations/**/*.ts`
   - `**/automation/**/*.ts`
   - `**/clients/**/*.ts`
   - `**/adapters/**/*.ts`

2. **Content patterns:**
   - Files creating HTTP clients for external APIs
   - Files implementing browser automation
   - Files wrapping CLI tools
   - Files with `fetch`, `axios`, `puppeteer`, `playwright` imports

## Research Checklist

Before implementing, the research document must contain:

1. **Problem Statement** - What capability is needed?
2. **Search Queries** - What was searched?
   - `gh search repos "<task> automation" --sort stars --limit 10`
   - `npm search <task>`
   - Relevant subreddits, HN, dev.to
3. **Top Candidates** - Tools found with >1k stars
4. **Evaluation** - Why each was accepted/rejected
5. **Decision** - Build vs buy with rationale

## Success Criteria

1. Creating file in `wrappers/` without research doc -> BLOCKED
2. Creating research doc with proper sections -> ALLOWED
3. Research doc with stars >5k tool rejected -> Warning logged
4. All research decisions tracked in registry
5. All hooks pass: `cd ~/.claude/hooks && bun test`

## Related Changes

- Builds upon `pre_build_gate.ts` pattern for blocking
- Integrates with correction ledger
- Aligns with Tool Selection Protocol philosophy
