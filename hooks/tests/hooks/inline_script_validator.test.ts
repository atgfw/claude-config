import { describe, it, expect } from 'vitest';
import { inlineScriptValidatorHook } from '../../src/hooks/inline_script_validator.js';
import { PreToolUseInput } from '../../src/types.js';

describe('inlineScriptValidator', () => {
  it('should block node -e with JSON', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'node -e "console.log({foo: \'bar\'})"',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('JSON');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('temp file');
  });

  it('should block node -e with template literals', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'node -e "console.log(`Hello ${name}`)"',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('template literals');
  });

  it('should block powershell -Command with $ variables', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'powershell -Command "$env:PATH"',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('powershell');
  });

  it('should block heredoc with backticks', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'cat <<EOF\n`date`\nEOF',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('heredoc');
  });

  it('should block heredoc with $() substitution', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'cat <<EOF\n$(date)\nEOF',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('$()');
  });

  it('should allow simple node -e commands', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'node -e "console.log(process.version)"',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow simple heredoc', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'cat <<EOF\nHello World\nEOF',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow non-Bash operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/file.ts',
      },
    };

    const result = await inlineScriptValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
