# Proposal: slim-claudemd-to-governance-index

## Problem

CLAUDE.md is 938 lines. It is loaded into every Claude Code context window, consuming ~4,000 tokens per session. A large portion of this content duplicates information that already exists (or should exist) in hook source files:

| Section | Lines | Content Type | Already In Code? |
|---------|-------|-------------|-----------------|
| n8n Webhook Path Naming | 97 | Rules, examples, JSON templates | Yes - n8n_webhook_path_validator.ts header |
| Hook System (6 tables) | 93 | Hook registry with events/purposes | Partially - settings.json + source files |
| GitHub Framework | 118 | Commit types, branch rules, secret patterns | Yes - git/*.ts source files |
| Dynamic Tool Router | 68 | Priority tables for tool selection | Yes - tool-router.json |
| Tool Selection Protocol | 67 | Detection patterns, research rules | Yes - tool_research_gate.ts |
| Context-Optimized Output | 54 | Verbosity levels, prefix meanings, anti-patterns | Yes - utils.ts |
| n8n Naming Conventions | 50 | snake_case, version ban, prefixes | Yes - n8n_naming_validator.ts |
| n8n Code Node Governance | 42 | Linting rules, exceptions | Yes - code_node_linting_gate.ts |
| Hook Implementation Status | 36 | Section-to-hook mapping (stale) | N/A - maintenance burden |
| n8n Node Documentation | 23 | Note requirements, good/bad examples | Yes - n8n_node_note_validator.ts |

**Total: ~648 lines of CLAUDE.md duplicate what hooks already enforce programmatically.** This content exists to tell the LLM about rules that hooks already block/warn about. The hooks' error messages are the right place for this guidance - they fire at exactly the moment the LLM needs the information.

## Root Cause

The documentation grew organically: rules were written in CLAUDE.md first, then hooks were built to enforce them. The CLAUDE.md text was never pruned after the hooks became self-enforcing. The result is a "belt AND suspenders AND a second belt" pattern that wastes context tokens.

## Solution

**Invert the documentation model:** Make hooks self-documenting (rich error messages with examples) and reduce CLAUDE.md to a lean governance index (~250-300 lines) that only contains:

1. **Behavioral directives** the LLM must follow (goal display, setup, architecture overview)
2. **A rule index** - one-line per rule pointing to the enforcing hook (the existing Critical Rules table)
3. **Interpretation guidance** that hooks cannot express (testing context interpretation, subagent invocation)
4. **References** to source files

Everything else moves into:
- **Hook error messages** - valid/invalid examples shown at block time
- **JSDoc headers** - comprehensive rule documentation in source
- **Dedicated reference files** - `hooks/docs/*.md` for detailed guides (already exists for vitest-migration.md)

## Scope

- CLAUDE.md: Reduce from ~938 lines to ~290 lines
- 15+ hook source files: Enrich error messages with examples and guidance
- 3-5 new `hooks/docs/*.md` reference files for detailed guides
- No behavioral changes to any hook logic

## Relationship to Existing Changes

| Change | Status | Relationship |
|--------|--------|-------------|
| `enforce-n8n-object-governance` | 41/45 done | Task 6.1 wired hook JSDoc to reference CLAUDE.md sections. This proposal **inverts** that: hooks reference `hooks/docs/*.md` instead. Natural successor, not conflict. |
| `add-project-open-reinit` | 0/41 | Includes "documentation drift detection" comparing CLAUDE.md against implementation. The drift detector should be aware of the new slim structure - may need a minor update to its comparison targets. |
| `add-self-escalation-mechanism` | 0/46 | References "Outdated CLAUDE.md" as an escalation pattern. Unaffected - the escalation concept still applies to the slim version. |
| All other changes | Various | No overlap. This proposal does not touch hook logic, settings.json, or any enforcement behavior. |

No existing proposal has attempted to reduce CLAUDE.md size or migrate its content elsewhere. This is net-new work.

## Out of Scope

- Changing hook enforcement logic
- Adding new hooks
- Modifying settings.json wiring
- Changing the goal display system (lines 9-39 stay as-is)
