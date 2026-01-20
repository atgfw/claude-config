# eslint-plugin-spinal-quality

Custom ESLint rules for the Spinal Cord hook system. These rules enforce code quality standards beyond what XO/ESLint provides by default.

## Installation

The plugin is built into the hooks package. After building:

```typescript
import { lint } from '@claude-config/hooks';
// lint.plugin - ESLint plugin object
// lint.rules - Individual rule modules
```

## Usage with ESLint

```javascript
import { Linter } from 'eslint';
import { lint } from '@claude-config/hooks';

const linter = new Linter();

// Register all rules
for (const [ruleName, ruleModule] of Object.entries(lint.rules)) {
  linter.defineRule(`spinal-quality/${ruleName}`, ruleModule);
}

// Use in verification
const messages = linter.verify(code, {
  rules: {
    'spinal-quality/ascii-only': 'error',
    'spinal-quality/require-regions': 'warn',
    // ... other rules
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});
```

## Rules Reference

### File Structure Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| `ascii-only` | Disallow non-ASCII characters in source code | No |
| `require-regions` | Require VSCode-style `// #region Name` blocks | No |
| `no-blank-lines-except-between-regions` | Only allow blank lines between `#endregion` and `#region` | No |
| `no-nested-function-declarations` | Disallow nested function declarations (use arrow functions) | No |

### Error Handling Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| `catch-throw-only` | Catch blocks must only rethrow the caught error | No |
| `no-multiline-error-message` | Error messages must be single-line (no `\n` or `\r`) | No |

### Console Quality Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| `no-empty-console-message` | Disallow empty or whitespace-only console messages | No |
| `console-message-requires-context` | Console calls need interpolation or multiple arguments | No |
| `no-generic-console-messages` | Disallow boilerplate messages like "Starting...", "Done" | No |

### Naming & Formatting Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| `multiline-call-args-over-3` | Require multiline formatting for calls with 4+ arguments | No |
| `for-loop-variable-i` | Loop iteration variables must be named `i` | No |
| `no-banned-identifiers` | Disallow generic identifiers (result, id, value, etc.) | No |

## Rule Details

### ascii-only

Disallows non-ASCII characters (code points > 127) in source code. This prevents accidental curly quotes, invisible characters, and emoji from entering the codebase.

```javascript
// Bad
const message = "Hello World";  // curly quotes

// Good
const message = "Hello World";  // straight quotes
```

### require-regions

Requires files to use VSCode-style `// #region Name` and `// #endregion` blocks for code organization.

```javascript
// Bad
const x = 1;

// Good
// #region Constants
const x = 1;
// #endregion
```

### no-blank-lines-except-between-regions

Only allows blank lines between an `#endregion` and the next `#region`. No blank lines inside regions.

```javascript
// Bad
// #region Test
const x = 1;

const y = 2;  // blank line inside region
// #endregion

// Good
// #region Constants
const x = 1;
const y = 2;
// #endregion

// #region Functions
function foo() {}
// #endregion
```

### no-nested-function-declarations

Disallows function declarations inside other functions. Use arrow functions instead.

```javascript
// Bad
function outer() {
  function inner() { return 1; }
  return inner();
}

// Good
function outer() {
  const inner = () => 1;
  return inner();
}
```

### catch-throw-only

Catch blocks must only contain a throw statement that rethrows the caught error.

```javascript
// Bad
try { foo(); } catch (err) { console.log(err); throw err; }
try { foo(); } catch { throw new Error('x'); }
try { foo(); } catch (err) { throw new Error('wrapped'); }

// Good
try { foo(); } catch (err) { throw err; }
```

### no-multiline-error-message

Error messages must be single-line (no embedded newlines).

```javascript
// Bad
throw new Error('Line 1\nLine 2');

// Good
throw new Error('Single line message');
```

### no-empty-console-message

Disallows console calls with empty or whitespace-only arguments.

```javascript
// Bad
console.log('');
console.log('   ');
console.log();

// Good
console.log('Processing data');
```

### console-message-requires-context

Console calls must include context via interpolation or multiple arguments.

```javascript
// Bad
console.log('Starting process');

// Good
console.log(`Value: ${x}`);
console.log('Value:', x);
console.log(data);
```

### no-generic-console-messages

Disallows boilerplate/generic messages that provide no useful information.

```javascript
// Bad
console.log('Starting the process');
console.log('Successfully completed');
console.log('done');

// Good
console.log('Processing user ID 123');
console.log(`Completed ${count} items`);
```

### multiline-call-args-over-3

Function calls with 4 or more arguments must be formatted with each argument on its own line.

```javascript
// Bad
foo(a, b, c, d);

// Good
foo(a, b, c);  // 3 args OK on one line
foo(
  a,
  b,
  c,
  d
);
```

### for-loop-variable-i

Loop iteration variables must be named `i`, not `index`, `item`, `key`, etc.

```javascript
// Bad
for (let index = 0; index < 10; index++) {}
for (const item of items) {}
for (const key in obj) {}

// Good
for (let i = 0; i < 10; i++) {}
for (const i of items) {}
for (const i in obj) {}
```

### no-banned-identifiers

Disallows generic variable names that don't convey meaning.

Banned identifiers: `result`, `id`, `pid`, `object`, `report`, `output`, `json`, `response`, `name`, `value`

```javascript
// Bad
const result = getData();
const id = 123;
function process(value) { return value; }

// Good
const userData = getData();
const userId = 123;
function process(rawInput) { return rawInput; }
```

## Testing

All rules are tested via Vitest:

```bash
cd hooks
npm test -- tests/lint/
```

## Development

To add a new rule:

1. Create `src/lint/rules/<rule-name>.ts`
2. Export from `src/lint/eslint-plugin-spinal-quality.ts`
3. Add tests to `tests/lint/spinal-quality-rules.test.ts`
4. Document in this README
