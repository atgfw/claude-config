# Change: Integrate ESLint Quality Rules

## Why

The `typescript_rules_suggestions.md` contains 14 custom ESLint rules that enforce code quality standards derived from a PowerShell framework. These rules address gaps in the current XO configuration:

- ASCII-only source files (no curly quotes, non-ASCII characters)
- VSCode region enforcement for file organization
- Strict catch-throw-only error handling pattern
- Console output quality (no empty/generic messages, require context)
- Banned identifier names (result, id, output, etc.)
- Loop variable naming (must use `i`)
- Multiline call argument formatting

These rules complement the existing XO setup and align with the Spinal Cord's deterministic enforcement philosophy.

## What Changes

**New Custom ESLint Plugin:**
- Create `eslint-plugin-spinal-quality` as a local plugin in `hooks/src/lint/`
- Implement 14 custom rules adapted for XO compatibility
- Use XO's rule extension mechanism to integrate

**Rules to Implement:**
1. `ascii-only` - Disallow non-ASCII characters
2. `require-regions` - Require VSCode `// #region` blocks
3. `no-blank-lines-except-between-regions` - Blank line placement
4. `no-nested-function-declarations` - Top-level functions only
5. `multiline-call-args-over-3` - Format calls with >3 args
6. `catch-throw-only` - Catch blocks must only rethrow
7. `no-empty-console-message` - No blank console output
8. `console-message-requires-context` - Console needs context
9. `no-generic-console-messages` - No boilerplate messages
10. `no-multiline-error-message` - Single-line error messages
11. `for-loop-variable-i` - Loop variable must be `i`
12. `no-banned-identifiers` - Block generic names

**XO Configuration Updates:**
- Register custom plugin in `xo.config.js`
- Enable rules with appropriate severity levels
- Maintain XO's 2-space indent (not 4-space from suggestions)
- Preserve Prettier compatibility

**Excluded/Deferred:**
- `jsdoc/require-*` rules - Already have partial coverage, defer full enforcement
- `@stylistic/indent: 4` - Keep XO's 2-space standard
- `@typescript-eslint/naming-convention` - XO already handles this
- Nondeterminism bans (Date, Math.random) - Defer to separate proposal

## Impact

- **Affected specs**: None (new capability)
- **Affected code**:
  - `hooks/src/lint/` - New directory for custom plugin
  - `hooks/xo.config.js` - Plugin registration and rule config
  - `hooks/package.json` - No new dependencies needed (ESLint is XO's peer dep)
- **Risk**: Low - rules can be set to `warn` initially, promoted to `error` after validation
