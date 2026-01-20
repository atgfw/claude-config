# ESLint Quality Rules Implementation Status

## Summary

The `eslint-plugin-spinal-quality` has been implemented with 12 custom ESLint rules. All rules are tested via Vitest (56 tests passing) but are not yet enforced through XO due to plugin registration compatibility issues.

## Implementation Details

### Completed

- **Plugin Infrastructure**: All files created in `hooks/src/lint/`
- **12 Rules Implemented**: All rules have full test coverage
- **Documentation**: README.md and JSDoc added to all files
- **Export**: Plugin exported from main `hooks/src/index.ts`

### XO Integration Status

The custom rules are excluded from XO linting (`ignores: ["src/lint/**/*.ts"]`) because:

1. ESLint rule implementations use AST visitor methods that must match node type names (PascalCase like `CallExpression`, `CatchClause`)
2. XO's strict camelCase naming convention conflicts with ESLint's required patterns
3. XO's flat config plugin registration had compatibility issues

**Workaround**: Rules are validated through Vitest tests instead of XO enforcement.

## Rule Violation Analysis

### Console Rules

The existing codebase uses `console.*` appropriately for:
- CLI output (`src/cli.ts`, `src/ledger/correction_ledger.ts`)
- Hook diagnostics (`src/hooks/context-summary-trigger.ts`)
- stderr for warnings

These usages are intentional and would be excluded from enforcement.

### File Structure Rules

- `require-regions`: Most hook files do not use `#region` blocks
- `no-blank-lines-except-between-regions`: Not applicable without regions

**Recommendation**: These rules are stylistic preferences. Consider making them opt-in per project rather than globally enforced.

### Error Handling Rules

- `catch-throw-only`: Some catch blocks in the codebase do more than just rethrow
- `no-multiline-error-message`: No violations found

**Recommendation**: The `catch-throw-only` rule is very strict. Consider allowing catch blocks that log AND rethrow, or making this rule advisory.

### Naming Rules

- `no-banned-identifiers`: Some usage of `result`, `name`, `value` in existing code
- `for-loop-variable-i`: Some loops use `idx`, `index` instead of `i`

**Recommendation**: Grandfather existing code and apply to new code only.

## Remediation Plan

### Phase 1: Current State (Completed)
- Rules implemented and tested via Vitest
- Not enforced through XO (compatibility issues)
- Documentation complete

### Phase 2: Gradual Adoption
1. Use rules in code reviews manually
2. Run rule checks in CI as informational (non-blocking)
3. Fix violations in new code

### Phase 3: Full Enforcement (Future)
1. Resolve XO plugin compatibility or switch to direct ESLint
2. Fix existing violations or add per-file ignores
3. Enable rules as errors

## Usage

### Direct ESLint Integration

```typescript
import { Linter } from 'eslint';
import { lint } from '@claude-config/hooks';

const linter = new Linter();
for (const [name, rule] of Object.entries(lint.rules)) {
  linter.defineRule(`spinal-quality/${name}`, rule);
}

const messages = linter.verify(code, {
  rules: {
    'spinal-quality/ascii-only': 'warn',
    // ... other rules
  }
});
```

### Vitest Verification

```bash
cd hooks
npm test -- tests/lint/
```

## Files Modified

- `hooks/src/lint/` - New plugin directory
- `hooks/src/index.ts` - Added lint export
- `hooks/package.json` - Added XO ignore for lint files, added eslint dependencies
- `hooks/xo.config.js` - Contains documentation (not active config)
