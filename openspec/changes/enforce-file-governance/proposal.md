# Proposal: Enforce File Governance

**Change ID:** `enforce-file-governance`
**Status:** Draft
**Created:** 2026-01-12

## Summary

Implement comprehensive file governance rules in the hook system to enforce strict naming conventions, prevent messy code, and ensure architectural hygiene across all file operations.

## Motivation

Current hooks only enforce:
- No emojis
- No deletion commands (archive instead)
- Morph MCP preference
- Code review requirement

Missing enforcement for:
- Filename conventions
- File necessity auditing
- Code brevity standards
- Runtime output naming

## Approved Rules (WARN-First Approach)

**Philosophy:** WARN allows agent to continue. BLOCK only for destructive/irreversible actions.

### Category 1: Filename Standards (WARN)

| ID | Rule | Action |
|----|------|--------|
| G1 | **No generic filenames** | WARN on `script.*`, `utils.*`, `temp*`, `v1*` |
| G2 | **Snake_case enforcement** | WARN on non-snake_case backend files |
| G3 | **Descriptive names** | WARN on single-word names < 8 chars |

### Category 2: Content Standards (WARN)

| ID | Rule | Action |
|----|------|--------|
| C1 | **Comment ratio** | WARN if > 30% comments |
| C2 | **Stub files** | WARN on < 3 lines of code |
| T1 | **Shell script size** | WARN on > 20 lines |
| T2 | **TypeScript preferred** | WARN on `.js` creation |

### Category 3: Critical (BLOCK - Existing)

| ID | Rule | Action |
|----|------|--------|
| X1 | **No deletion** | BLOCK `rm`, `del`, `Remove-Item` |
| X2 | **No emojis** | BLOCK emoji content |

## Implementation Approach

1. Extend `pre-write` hook with filename validation
2. Add static analysis for content standards
3. Create `file_governance_rules.ts` configuration
4. Add runtime output validation to `post-tool-use` hook

## Questions for Approval

1. Which rules should be **BLOCK** vs **WARN**?
2. Should G3 (descriptive names) have a minimum character count?
3. Should S1 (archive before replace) apply to ALL files or only code files?
4. Accept the scaffolding script (`scaffold_new_file.ts`)?

## Related Files

- `~/.claude/hooks/src/hooks/pre-write.ts`
- `~/.claude/hooks/src/hooks/pre-bash.ts`
- `~/.claude/hooks/src/utils.ts`
