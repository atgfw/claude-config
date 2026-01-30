/**
 * Code Node Test Validator Hook Tests
 * TDD: Verify code node tests follow Vitest + fixtures pattern
 */

import * as fs from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { codeNodeTestValidatorHook } from '../src/hooks/code_node_test_validator.js';
import type { PreToolUseInput } from '../src/types.js';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

describe('Code Node Test Validator Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Non-Code-Node Test Files (Should Always Allow)', () => {
    it('should allow writes to regular src/ files', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/src/index.ts',
          content: 'export const foo = 1;',
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to regular test files', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/unit/utils.test.ts',
          content: "import { describe } from 'vitest';",
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow writes to fixture JSON files', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-node/fixtures/valid-input.json',
          content: '{"id": "test"}',
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Code Node Test Files - Extension Check', () => {
    it('should block .test.js files in code-nodes directory', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.js',
          content: 'console.log("test");',
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('.test.ts');
    });

    it('should allow .test.ts files with correct pattern', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'valid-input.json',
        'valid-expected.json',
      ] as unknown as fs.Dirent[]);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';
import validInput from './fixtures/valid-input.json';
import validExpected from './fixtures/valid-expected.json';

describe('validator', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Vitest Import Check', () => {
    it('should block tests without Vitest imports', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
// No vitest import
function test() {
  console.log("testing");
}
test();
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Vitest');
    });

    it('should allow tests with proper Vitest imports', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'test-input.json',
        'test-expected.json',
      ] as unknown as fs.Dirent[]);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect, vi } from 'vitest';
import testInput from './fixtures/test-input.json';

describe('validator', () => {
  it('validates correctly', () => {
    expect(true).toBe(true);
  });
});
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Console.log Anti-Pattern Detection', () => {
    it('should block tests with console.log PASS/FAIL patterns', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';

// Bad: using console.log for test results
let passed = 0;
let failed = 0;

try {
  validate({});
  console.log('TEST 1 PASS');
  passed++;
} catch (e) {
  console.log('TEST 1 FAIL');
  failed++;
}

process.exit(failed > 0 ? 1 : 0);
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('console.log');
    });

    it('should block tests with passed++/failed++ counters', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';

let passed = 0;
let failed = 0;

if (result) {
  passed++;
} else {
  failed++;
}
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block tests with process.exit()', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';

describe('test', () => {
  it('works', () => {
    if (failed > 0) {
      process.exit(1);
    }
  });
});
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Edge Cases', () => {
    it('should allow when no file path provided', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when no content provided', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle Windows paths correctly', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:\\Users\\test\\project\\tests\\code-nodes\\my-workflow\\validator.test.js',
          content: 'console.log("test");',
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      // Should still detect as code-node test and block for .js
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Fixture Warnings', () => {
    it('should warn when no fixtures directory exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';

describe('validator', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      // Should allow but with warning (check logs, not decision)
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should warn when fixtures exist but no input files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['some-other-file.json'] as unknown as fs.Dirent[]);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: 'C:/Users/test/project/tests/code-nodes/my-workflow/validator.test.ts',
          content: `
import { describe, it, expect } from 'vitest';

describe('validator', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
          `,
        },
      };

      const output = await codeNodeTestValidatorHook(input);

      // Should allow but with warning
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
