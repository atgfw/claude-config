# Change: Improve Goal Auto-Derivation Quality

## Why

When goals are auto-derived from git branches or GitHub issues, the extracted fields often contain placeholders like "Target object not specified" or "Failure modes not defined". This causes:

1. `goal_compliance_gate` blocks session Stop at 73% compliance
2. Users must manually edit JSON files to fix placeholder fields
3. Overhead that should be automated is pushed onto humans

The auto-derivation infrastructure exists (`goal_auto_derivation.ts`) but field extraction is weak.

## What Changes

- **Smarter field extraction** from GitHub issue bodies (parse markdown sections, code blocks, file paths)
- **Context inference** from git diff, recently modified files, branch naming conventions
- **Fallback enrichment** from codebase patterns (detect test files, config files, source directories)
- **Validation before push** only push goals that would pass compliance gate

### NOT Changing
- Session-scoped goal architecture remains (no global goal flow)
- Compliance gate severity remains (still blocks, not warns)

## Impact

- Affected code:
  - `hooks/src/hooks/goal_auto_derivation.ts` - Enhanced field extraction
  - `hooks/src/session/goal_stack.ts` - Pre-push validation
- No spec deltas required - this is implementation improvement
