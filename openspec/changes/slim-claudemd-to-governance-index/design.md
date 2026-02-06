# Design: slim-claudemd-to-governance-index

## Architectural Decision: Where Documentation Lives

### Current State (Redundant)

```
CLAUDE.md (938 lines, loaded every session)
  |-- Detailed rule descriptions with examples
  |-- Valid/invalid tables
  |-- JSON templates
  |-- Hook registry tables
  |-- Implementation status matrix

hooks/src/**/*.ts (20,767 lines total)
  |-- JSDoc headers (often duplicating CLAUDE.md)
  |-- Programmatic enforcement
  |-- Error messages (terse, lacking examples)
```

### Target State (Single Source of Truth)

```
CLAUDE.md (~290 lines, loaded every session)
  |-- Purpose + Active Goal Display (mandatory LLM behavior)
  |-- Setup + Architecture overview
  |-- Critical Rules index (1 line per rule -> hook name)
  |-- Interpretation guidance (non-automatable context)
  |-- References to source files

hooks/src/**/*.ts (enriched error messages)
  |-- JSDoc headers: canonical rule documentation
  |-- Block messages: include valid/invalid examples
  |-- Suggestions: actionable fix guidance at point of failure

hooks/docs/*.md (detailed reference guides)
  |-- n8n-governance.md (webhook paths, naming, notes, linting)
  |-- github-framework.md (commits, branches, secrets, semver)
  |-- tool-routing.md (priority hierarchies, framework exceptions)
  |-- verbosity-system.md (output levels, prefixes, anti-patterns)
```

## Key Design Decisions

### 1. Error Messages Are Documentation

**Rationale:** When a hook blocks an action, the LLM reads the error message. This is the exact moment it needs guidance. Moving examples into error messages means the LLM gets rule details precisely when relevant, instead of carrying 938 lines of context at all times.

**Pattern - Before:**
```
CLAUDE.md says: "Webhook paths must be kebab-case. Invalid: customer_sync. Valid: customer-sync"
Hook blocks with: "[X] Path not kebab-case"
```

**Pattern - After:**
```
CLAUDE.md says: "Webhook paths: enforced by n8n_webhook_path_validator"
Hook blocks with: "[X] Path 'customer_sync' not kebab-case. Use 'customer-sync' instead."
```

The LLM learns the rule from the error, not from pre-loaded documentation.

### 2. CLAUDE.md Sections: Keep vs. Move vs. Delete

| Section | Lines | Verdict | Reason |
|---------|-------|---------|--------|
| Purpose | 4 | **KEEP** | Identity statement |
| Active Goal Display | 32 | **KEEP** | Mandatory LLM behavior, not automatable |
| Setup | 13 | **KEEP** | Onboarding reference |
| Architecture | 42 | **KEEP** (trim to 20) | Directory overview, remove file-level detail |
| Critical Rules | 40 | **KEEP** | Lean index - already the right format |
| Context-Optimized Output | 54 | **MOVE** to hooks/docs/verbosity-system.md | Developer reference, not LLM directive |
| Hierarchical Development | 17 | **KEEP** (already lean) | Philosophy statement + hook refs |
| Source of Truth: LIVE APIs | 31 | **TRIM** to 8 lines | Keep rule + enforcing hooks, cut details |
| Testing Context Interpretation | 11 | **KEEP** | Non-automatable interpretation guidance |
| n8n Workflow Requirements | 17 | **TRIM** to 5 lines | Keep rule names + hook refs only |
| n8n Naming Conventions | 50 | **MOVE** to hook error messages + docs | Fully enforced by n8n_naming_validator |
| n8n Node Documentation | 23 | **MOVE** to hook error messages + docs | Fully enforced by n8n_node_note_validator |
| n8n Code Node Governance | 42 | **MOVE** to hook error messages + docs | Fully enforced by code_node_linting_gate |
| n8n Webhook Path Naming | 97 | **MOVE** to hook error messages + docs | Fully enforced by n8n_webhook_path_validator |
| Test Framework: Vitest | 6 | **KEEP** | Already lean |
| Hook System (6 tables) | 93 | **DELETE** | Stale inventory; `settings.json` is authoritative |
| Hook Implementation Status | 36 | **DELETE** | Stale audit artifact, maintenance burden |
| Tool Selection Protocol | 67 | **MOVE** to hook error messages + docs | Fully enforced by tool_research_gate |
| Browser Automation Rules | 14 | **KEEP** | Already lean |
| MCP Self-Healing | 9 | **KEEP** | Already lean |
| Dynamic Tool Router | 68 | **MOVE** to hooks/docs/tool-routing.md | Reference material, tool-router.json is authoritative |
| Subagent Invocation | 11 | **KEEP** | Non-automatable guidance |
| API Key Architecture | 9 | **KEEP** | Already lean |
| Task Completion Checklist | 11 | **KEEP** | Behavioral checklist |
| GitHub Framework | 118 | **MOVE** to hooks/docs/github-framework.md | Fully enforced by git/*.ts hooks |
| References | 19 | **KEEP** (update paths) | Navigation aid |

### 3. Reference Docs in hooks/docs/

Detailed guides go into `hooks/docs/*.md`. These are NOT loaded into context - they exist for:
- Human developers reading the codebase
- Claude Code to `Read` on-demand when investigating a specific hook
- New hook authors understanding conventions

These files consolidate the verbose content removed from CLAUDE.md with the JSDoc already in hook headers, creating a single detailed reference per domain.

### 4. No Logic Changes

This is purely a documentation restructuring. No hook behavior, enforcement levels, or settings.json wiring changes. The hooks continue to enforce the same rules with the same severity - they just explain themselves better when they fire.

## Risk Analysis

| Risk | Mitigation |
|------|-----------|
| LLM stops following rules not in CLAUDE.md | Rules are enforced by hooks - LLM compliance is nice-to-have, hooks are the real enforcement |
| Error messages become too verbose | Use terse mode: rich messages only in normal/verbose, single-line in terse |
| hooks/docs/*.md become stale | documentation_drift_detector hook already exists for this |
| Transition period inconsistency | Phase tasks sequentially: enrich hooks first, then trim CLAUDE.md |

## Line Budget for Slim CLAUDE.md

| Section | Target Lines |
|---------|-------------|
| Purpose | 4 |
| Active Goal Display | 32 |
| Setup | 13 |
| Architecture (trimmed) | 20 |
| Critical Rules index | 40 |
| Hierarchical Development | 10 |
| Source of Truth (trimmed) | 8 |
| Testing Context Interpretation | 11 |
| n8n Workflow Requirements (trimmed) | 5 |
| Test Framework: Vitest | 6 |
| Browser Automation Rules | 14 |
| MCP Self-Healing | 9 |
| Subagent Invocation | 11 |
| API Key Architecture | 9 |
| Task Completion Checklist | 11 |
| References (updated) | 19 |
| **Total** | **~222** |

Buffer for formatting/headers brings this to ~280-300 lines. A **68% reduction** from 938 lines.
