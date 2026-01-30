---
name: Hook Proposal
about: Propose a new governance hook
labels: type/feat, system/hooks, lifecycle/triage
---

## Problem
<!-- What governance gap does this hook fill -->

## Solution
<!-- Hook design: event, matcher, enforcement level -->

## Proposed Hook

| Property | Value |
|----------|-------|
| Name | `hook_name` |
| Event | PreToolUse / PostToolUse / UserPromptSubmit / SessionStart |
| Matcher | Tool pattern |
| Enforcement | STRICT (block) / WARN (allow) |

## Acceptance Criteria
- [ ] Hook implemented with TDD (Vitest)
- [ ] Registered in settings.json
- [ ] Documented in CLAUDE.md
- [ ] Correction ledger entry linked

## Source
- Correction ledger:
- Escalation: N/A
- OpenSpec: N/A
