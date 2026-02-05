# Test 03: Self-Heal (Hook Compilation)

## Goal

Verify that session start automatically rebuilds hooks when dist/ is missing or stale.

## Feature Under Test

- **File:** `hooks/src/session/hook_compilation_validator.ts`
- **Function:** `validateHookCompilation()`
- **Severity:** STRICT (blocks if rebuild fails, self-heals if possible)

## Prerequisites

- Bun runtime installed
- Write permissions to hooks/dist/
- Valid TypeScript source in hooks/src/

## Setup Command

```bash
bun run scripts/test-setup/session-reinit/setup-stale-hooks.ts
```

The setup script will:
1. Delete hooks/dist/ directory entirely
2. OR touch hooks/src/*.ts to make them newer than dist/*.js

## Test Steps

1. Run the setup script to create stale hooks condition
2. Start a new Claude Code session
3. Observe self-healing behavior

## Expected Output

When dist/ is missing or stale:

```
[SELF-HEAL] Hook compilation stale or missing
Rebuilding hooks... (bun run build)
[+] Hooks rebuilt successfully
```

When rebuild fails:

```
[X] Hook Compilation Failed

Unable to rebuild hooks automatically.
Error: <build error message>

Manual intervention required:
  cd ~/.claude/hooks && bun run build

Session blocked until hooks compile successfully.
```

## Verification Checklist

- [ ] Self-heal triggers when dist/ is missing
- [ ] Self-heal triggers when src/*.ts is newer than dist/*.js
- [ ] `[SELF-HEAL]` prefix appears in output
- [ ] Session continues after successful rebuild
- [ ] Session blocks if rebuild fails

## Cleanup Command

```bash
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

Or manually:
```bash
cd ~/.claude/hooks && bun run build
```

## Edge Cases to Test

1. **Partial dist/**: Delete only some .js files
   - Expected: Rebuild triggered for missing files

2. **Build error**: Introduce syntax error in .ts file
   - Expected: Session blocked with clear error

3. **Permission denied**: Make dist/ read-only
   - Expected: Clear error about permissions

4. **Concurrent sessions**: Start two sessions simultaneously
   - Expected: Only one rebuild occurs (or graceful handling)
