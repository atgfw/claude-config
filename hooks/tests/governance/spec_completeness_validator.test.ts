import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { specCompletenessValidatorHook } from '../../src/governance/spec_completeness_validator.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('specCompletenessValidator', () => {
  let temporaryDir: string;

  beforeEach(() => {
    temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-test-'));
  });

  afterEach(() => {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  });

  it('should allow Write when complete spec exists', async () => {
    const implPath = path.join(temporaryDir, 'transform.ts');
    const specPath = path.join(temporaryDir, 'spec.md');

    fs.writeFileSync(
      specPath,
      `
# Spec

inputs:
  - name: data

logic:
  1. Transform data

outputs:
  - name: result

routes:
  success: next node

test_cases:
  - name: test 1
`
    );

    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: implPath,
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should block Write when spec has PENDING markers', async () => {
    const implPath = path.join(temporaryDir, 'transform.ts');
    const specPath = path.join(temporaryDir, 'spec.md');

    fs.writeFileSync(
      specPath,
      `
# Spec

## ENFORCER AUDIT

- [ ] PENDING: Review inputs
- [x] Logic verified

inputs:
  - name: data
`
    );

    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: implPath,
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Spec incomplete');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('audit');
  });

  it('should block Write when spec has TODO markers', async () => {
    const implPath = path.join(temporaryDir, 'transform.ts');
    const specPath = path.join(temporaryDir, 'spec.md');

    fs.writeFileSync(
      specPath,
      `
# Spec

TODO: Add test cases

inputs:
  - name: data
`
    );

    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: implPath,
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('TODO');
  });

  it('should warn when no spec file found', async () => {
    const implPath = path.join(temporaryDir, 'transform.ts');

    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: implPath,
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('No spec file found');
  });

  it('should allow non-implementation files', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(temporaryDir, 'README.md'),
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow test files without spec', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(temporaryDir, 'test', 'transform.test.ts'),
      },
    };

    const result = await specCompletenessValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
