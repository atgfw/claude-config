# Context-Optimized Output (Verbosity System)

Hook output strategy to minimize context window consumption. Implemented in `hooks/src/utils.ts`.

## Verbosity Levels

| Level | Env Var | Behavior |
|-------|---------|----------|
| `silent` | `HOOK_VERBOSITY=silent` | No output except critical errors |
| `terse` | `HOOK_VERBOSITY=terse` | Single-line, minimal output (default) |
| `normal` | `HOOK_VERBOSITY=normal` | Standard output with context |
| `verbose` | `HOOK_VERBOSITY=verbose` | Detailed output for debugging |

## Output Principles

1. **Density over verbosity** - Maximum information in minimum characters
2. **Batch, don't enumerate** - Show counts, not lists (in terse mode)
3. **Skip obvious successes** - Only log notable/unexpected results
4. **No redundancy** - Never restate what's already in context
5. **Structured brevity** - Tables > prose, bullets > paragraphs

## Terse Output Format

| Prefix | Meaning | Example |
|--------|---------|---------|
| `[+]` | Success with info | `[+] 3 files updated` |
| `[X]` | Blocked | `[X] Missing PROJECT-DIRECTIVE.md` |
| `[!]` | Warning | `[!] Webhook missing auth` |
| `[ERR]` | Error | `[ERR] Build failed: syntax error` |

## Hook Output Functions

```typescript
import { logTerse, logBlocked, logAllowed, logWarn, logBatch } from '../utils.js';

// Terse mode examples:
logTerse('[+] Hook passed');           // Always shows (except silent)
logBlocked('Missing spec');            // Shows as [X] in terse
logAllowed('Tests pass');              // Skipped if obvious success
logWarn('Deprecated pattern');         // Shows as [!]
logBatch('Files checked', files, 3);   // Shows count in terse, list in normal
```

## Anti-Patterns (AVOID)

| Bad | Better |
|-----|--------|
| `log('Starting to check files...')` | (skip entirely) |
| `log('File 1: OK\nFile 2: OK\nFile 3: OK')` | `logBatch('Checked', files)` |
| `log('[OK] Action allowed')` | (skip success confirmations) |
| `log('From CLAUDE.md:\n> Rule text here')` | (skip in terse, show in verbose) |
