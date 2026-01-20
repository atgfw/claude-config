import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from '../../src/lint/eslint-plugin-spinal-quality.js';

function createLinter(): Linter {
  const linter = new Linter();
  for (const [ruleName, ruleModule] of Object.entries(plugin.rules)) {
    linter.defineRule(`spinal-quality/${ruleName}`, ruleModule);
  }

  return linter;
}

function lint(code: string, rules: Record<string, Linter.RuleEntry>): Linter.LintMessage[] {
  const linter = createLinter();
  return linter.verify(code, {
    rules,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  });
}

describe('eslint-plugin-spinal-quality', () => {
  describe('ascii-only', () => {
    const rules = { 'spinal-quality/ascii-only': 'error' };
    it('should pass for ASCII-only code', () => {
      const code = 'const message = "Hello World";';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report non-ASCII character (curly quote)', () => {
      // U+201C LEFT DOUBLE QUOTATION MARK
      const code = 'const message = "\u201cHello World\u201d";';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('nonAscii');
    });
    it('should report emoji character', () => {
      // U+1F680 ROCKET emoji
      const code = 'const rocket = "\u{1F680}go";';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('nonAscii');
    });
  });

  describe('require-regions', () => {
    const rules = { 'spinal-quality/require-regions': 'error' };
    it('should pass for file with proper regions', () => {
      const code = `// #region Imports
import foo from 'foo';
// #endregion`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report missing regions', () => {
      const code = 'const x = 1;';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('missingAny');
    });
    it('should report region without name', () => {
      // The regex requires a name after #region - test a region with only whitespace after
      const code = `// #region
const x = 1;
// #endregion`;
      const messages = lint(code, rules);
      // With no name, the regex won't match as a valid region, so it will report missingAny
      expect(
        messages.some((m) => m.messageId === 'missingAny' || m.messageId === 'regionMissingName')
      ).toBe(true);
    });
    it('should report endregion with name', () => {
      const code = `// #region Test
const x = 1;
// #endregion Test`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'endHasName')).toBe(true);
    });
    it('should report unclosed region', () => {
      const code = `// #region Start
const x = 1;`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'startWithoutEnd')).toBe(true);
    });
    it('should report endregion without start', () => {
      const code = `const x = 1;
// #endregion`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'endWithoutStart')).toBe(true);
    });
  });

  describe('no-blank-lines-except-between-regions', () => {
    const rules = { 'spinal-quality/no-blank-lines-except-between-regions': 'error' };
    it('should pass for blank line between endregion and region', () => {
      const code = `// #region One
const x = 1;
// #endregion

// #region Two
const y = 2;
// #endregion`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report blank line inside region', () => {
      const code = `// #region Test
const x = 1;

const y = 2;
// #endregion`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'blankLine')).toBe(true);
    });
  });

  describe('no-nested-function-declarations', () => {
    const rules = { 'spinal-quality/no-nested-function-declarations': 'error' };
    it('should pass for top-level function declaration', () => {
      const code = 'function foo() { return 1; }';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should pass for exported function declaration', () => {
      const code = 'export function foo() { return 1; }';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report nested function declaration', () => {
      const code = `function outer() {
  function inner() { return 1; }
  return inner();
}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('nested');
    });
    it('should allow arrow function inside function', () => {
      const code = `function outer() {
  const inner = () => 1;
  return inner();
}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
  });

  describe('catch-throw-only', () => {
    const rules = { 'spinal-quality/catch-throw-only': 'error' };
    it('should pass for catch that only rethrows', () => {
      const code = `try { foo(); } catch (err) { throw err; }`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report catch without param', () => {
      const code = `try { foo(); } catch { throw new Error('x'); }`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'mustHaveParam')).toBe(true);
    });
    it('should report catch with additional logic', () => {
      const code = `try { foo(); } catch (err) { console.log(err); throw err; }`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'onlyThrow')).toBe(true);
    });
    it('should report catch throwing different identifier', () => {
      const code = `try { foo(); } catch (err) { throw new Error('wrapped'); }`;
      const messages = lint(code, rules);
      expect(messages.some((m) => m.messageId === 'mustRethrowSame')).toBe(true);
    });
  });

  describe('no-multiline-error-message', () => {
    const rules = { 'spinal-quality/no-multiline-error-message': 'error' };
    it('should pass for single-line error message', () => {
      const code = `throw new Error('Single line message');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report error with newline in string', () => {
      const code = `throw new Error('Line 1\\nLine 2');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('multiline');
    });
    it('should report TypeError with newline', () => {
      const code = `throw new TypeError('Line 1\\nLine 2');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report template literal with newline', () => {
      const code = 'throw new Error(`Line 1\nLine 2`);';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
  });

  describe('no-empty-console-message', () => {
    const rules = { 'spinal-quality/no-empty-console-message': 'error' };
    it('should pass for console with content', () => {
      const code = `console.log('Hello');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report console with empty string', () => {
      const code = `console.log('');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('empty');
    });
    it('should report console with whitespace-only string', () => {
      const code = `console.log('   ');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report console with no arguments', () => {
      const code = `console.log();`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report console.warn with empty template literal', () => {
      const code = 'console.warn(``);';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
  });

  describe('console-message-requires-context', () => {
    const rules = { 'spinal-quality/console-message-requires-context': 'error' };
    it('should pass for console with template interpolation', () => {
      const code = 'const x = 1; console.log(`Value: ${x}`);';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should pass for console with multiple arguments', () => {
      const code = `const x = 1; console.log('Value:', x);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should pass for console with object argument', () => {
      const code = `const data = {}; console.log(data);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report bare string literal', () => {
      const code = `console.log('Starting process');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('needsContext');
    });
    it('should report bare template literal without interpolation', () => {
      // Template literal without expressions is treated like a bare string
      const code = 'console.log(`A message`);';
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('needsContext');
    });
  });

  describe('no-generic-console-messages', () => {
    const rules = { 'spinal-quality/no-generic-console-messages': 'error' };
    it('should pass for specific message', () => {
      const code = `console.log('Processing user ID 123');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report "Starting" prefix', () => {
      const code = `console.log('Starting the process');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('generic');
    });
    it('should report "Successfully" prefix', () => {
      const code = `console.log('Successfully completed');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report "Completed" prefix', () => {
      const code = `console.log('Completed operation');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report "done" message', () => {
      const code = `console.log('done');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report "executed successfully" message', () => {
      const code = `console.log('Task executed successfully');`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
  });

  describe('multiline-call-args-over-3', () => {
    const rules = { 'spinal-quality/multiline-call-args-over-3': 'error' };
    it('should pass for 3 or fewer args on single line', () => {
      const code = `foo(a, b, c);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should pass for 4+ args properly formatted', () => {
      const code = `foo(
  a,
  b,
  c,
  d
);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report 4+ args on single line', () => {
      const code = `foo(a, b, c, d);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('multiline');
    });
    it('should report new expression with 4+ args on single line', () => {
      const code = `new Foo(a, b, c, d);`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
  });

  describe('for-loop-variable-i', () => {
    const rules = { 'spinal-quality/for-loop-variable-i': 'error' };
    it('should pass for loop with i variable', () => {
      const code = `for (let i = 0; i < 10; i++) {}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report for loop with index variable', () => {
      const code = `for (let index = 0; index < 10; index++) {}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('mustBeI');
    });
    it('should report for-of loop with item variable', () => {
      const code = `const items = []; for (const item of items) {}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report for-in loop with key variable', () => {
      const code = `const obj = {}; for (const key in obj) {}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should pass for-of loop with i variable', () => {
      const code = `const items = []; for (const i of items) {}`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
  });

  describe('no-banned-identifiers', () => {
    const rules = { 'spinal-quality/no-banned-identifiers': 'error' };
    it('should pass for descriptive variable names', () => {
      const code = `const userData = {};`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(0);
    });
    it('should report banned variable name "result"', () => {
      const code = `const result = getData();`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe('banned');
    });
    it('should report banned variable name "id"', () => {
      const code = `const id = 123;`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report banned parameter name "value"', () => {
      const code = `function process(value) { return value; }`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report banned parameter in arrow function', () => {
      const code = `const fn = (response) => response;`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report banned function name', () => {
      const code = `function output() { return 1; }`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report banned import name', () => {
      const code = `import { name } from 'module';`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
    it('should report banned default import name', () => {
      const code = `import json from 'module';`;
      const messages = lint(code, rules);
      expect(messages).toHaveLength(1);
    });
  });
});
