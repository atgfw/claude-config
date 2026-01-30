# Design: Tool Research Gate

**Change ID:** `add-tool-research-gate`

## Context

The Spinal Cord philosophy states that every human corrective action represents a failure. The browser-use/Scrapling incident revealed a missing enforcement mechanism: no process ensures research before implementation.

**Stakeholders:**
- Claude Code sessions (enforcement target)
- Human operators (research reviewers)
- Correction ledger (violation tracking)

**Constraints:**
- Must work offline (cached research allowed)
- Must not block legitimate greenfield development
- Must integrate with existing hook pipeline
- Research documents must be human-readable

## Goals / Non-Goals

**Goals:**
- Block wrapper/integration creation without documented research
- Provide automated discovery of existing tools
- Track all research decisions for audit
- Warn when rejecting well-established tools

**Non-Goals:**
- Automated tool selection (humans decide)
- Blocking all new code (only wrappers/integrations)
- Perfect accuracy in detection (false positives OK, false negatives bad)

## Decisions

### Decision 1: Hook Event Type

**Choice:** PreToolUse on Write/Edit operations

**Alternatives:**
- UserPromptSubmit (too early, before code is written)
- PostToolUse (too late, code already written)
- SessionStart (wrong granularity)

**Rationale:** PreToolUse allows blocking before the file is written, matching pre_build_gate pattern.

### Decision 2: Research Document Location

**Choice:** `TOOL-RESEARCH.md` in same directory as wrapper

**Alternatives:**
- Central registry file (hard to navigate)
- Inline comments (not structured enough)
- Separate research/ directory (disconnected from code)

**Rationale:** Co-locating research with implementation makes decisions discoverable and auditable.

### Decision 3: Detection Strategy

**Choice:** Path patterns (primary) + Content analysis (secondary)

**Path patterns:**
```typescript
const WRAPPER_PATH_PATTERNS = [
  /[/\\]wrappers[/\\]/i,
  /[/\\]integrations[/\\]/i,
  /[/\\]automation[/\\]/i,
  /[/\\]clients[/\\]/i,
  /[/\\]adapters[/\\]/i,
  /[/\\]connectors[/\\]/i,
];
```

**Content patterns (for edge cases):**
```typescript
const WRAPPER_CONTENT_PATTERNS = [
  /import.*from\s+['"]axios['"]/,
  /import.*from\s+['"]node-fetch['"]/,
  /import.*from\s+['"]puppeteer['"]/,
  /import.*from\s+['"]playwright['"]/,
  /new\s+\w+Client\(/,
  /class\s+\w+Wrapper/,
];
```

**Rationale:** Path patterns are fast and have high precision. Content analysis catches edge cases where code is in non-standard locations.

### Decision 4: Research Validation Schema

**Choice:** Structured markdown with required sections

```markdown
# Tool Research: [Problem Domain]

## Problem Statement
[Required: What capability is needed?]

## Search Queries Executed
- [ ] `gh search repos "<task>" --sort stars --limit 10`
- [ ] `npm search <task>`
- [ ] Manual research: [sources]

## Candidates Found

### [Tool Name] - [Stars] stars
- **URL:** [link]
- **Last Updated:** [date]
- **Evaluation:** [why considered]
- **Decision:** ACCEPTED | REJECTED
- **Reason:** [rationale]

## Final Decision
- **Choice:** BUILD | USE [tool name]
- **Rationale:** [explanation]
```

**Rationale:** Structured format enables automated validation and ensures complete documentation.

### Decision 5: Star Threshold Warning

**Choice:** 5,000 stars triggers warning (not block)

**Alternatives:**
- 1,000 stars (too many false positives)
- 10,000 stars (misses significant tools)
- No threshold (no automated guidance)

**Rationale:** 5k stars represents significant community validation. Warning ensures human awareness without blocking legitimate decisions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| False positives on non-wrapper code | Path pattern allowlist for exclusions |
| gh CLI not available | Graceful degradation with manual research |
| Outdated star counts | Cache with TTL, allow override |
| Blocking legitimate greenfield | Override flag in research doc |

## Migration Plan

1. Deploy hook in WARN mode initially
2. Monitor false positive rate for 1 week
3. Tune detection patterns based on feedback
4. Switch to BLOCK mode
5. No rollback needed (new functionality)

## Open Questions

1. Should we enforce research for MCP tool wrappers specifically?
2. Should pypi search be included for Python projects?
3. What's the cache TTL for GitHub star counts?
