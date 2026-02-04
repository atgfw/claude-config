/**
 * Tests for Full Path Validator Hook
 *
 * GitHub Issue: #31
 */

import { describe, it, expect } from 'vitest';
import {
  isAbsolutePath,
  expandToAbsolute,
  extractPaths,
  fullPathValidatorHook,
} from '../src/hooks/full_path_validator.js';

describe('isAbsolutePath', () => {
  describe('Unix paths', () => {
    it('recognizes Unix absolute paths', () => {
      expect(isAbsolutePath('/home/user/file.ts')).toBe(true);
      expect(isAbsolutePath('/etc/config')).toBe(true);
      expect(isAbsolutePath('/')).toBe(true);
    });

    it('rejects Unix relative paths', () => {
      expect(isAbsolutePath('./file.ts')).toBe(false);
      expect(isAbsolutePath('../parent/file.ts')).toBe(false);
      expect(isAbsolutePath('src/index.ts')).toBe(false);
    });
  });

  describe('Windows paths', () => {
    it('recognizes Windows absolute paths with backslash', () => {
      expect(isAbsolutePath('C:\\Users\\codya\\file.ts')).toBe(true);
      expect(isAbsolutePath('D:\\Projects\\src')).toBe(true);
      expect(isAbsolutePath('E:\\')).toBe(true);
    });

    it('recognizes Windows absolute paths with forward slash', () => {
      expect(isAbsolutePath('C:/Users/codya/file.ts')).toBe(true);
      expect(isAbsolutePath('D:/Projects/src')).toBe(true);
    });

    it('recognizes UNC paths', () => {
      expect(isAbsolutePath('\\\\server\\share\\file.ts')).toBe(true);
      expect(isAbsolutePath('\\\\nas\\backup')).toBe(true);
    });

    it('rejects Windows relative paths', () => {
      expect(isAbsolutePath('.\\file.ts')).toBe(false);
      expect(isAbsolutePath('..\\parent\\file.ts')).toBe(false);
      expect(isAbsolutePath('src\\index.ts')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects empty strings', () => {
      expect(isAbsolutePath('')).toBe(false);
      expect(isAbsolutePath('   ')).toBe(false);
    });

    it('rejects bare filenames', () => {
      expect(isAbsolutePath('file.ts')).toBe(false);
      expect(isAbsolutePath('index.js')).toBe(false);
    });
  });
});

describe('extractPaths', () => {
  it('extracts file_path from Read tool', () => {
    const paths = extractPaths('Read', { file_path: '/home/user/file.ts' });
    expect(paths).toEqual(['/home/user/file.ts']);
  });

  it('extracts file_path from Write tool', () => {
    const paths = extractPaths('Write', {
      file_path: 'C:\\Users\\codya\\file.ts',
      content: 'hello',
    });
    expect(paths).toEqual(['C:\\Users\\codya\\file.ts']);
  });

  it('extracts path from Grep tool', () => {
    const paths = extractPaths('Grep', {
      pattern: 'function',
      path: '/home/user/src',
    });
    expect(paths).toEqual(['/home/user/src']);
  });

  it('extracts path portion from Glob pattern', () => {
    const paths = extractPaths('Glob', {
      pattern: 'src/components/**/*.tsx',
    });
    expect(paths).toEqual(['src/components/']);
  });

  it('skips pure glob patterns without path', () => {
    const paths = extractPaths('Glob', {
      pattern: '*.ts',
    });
    expect(paths).toEqual([]);
  });

  it('extracts both path and pattern path from Glob', () => {
    const paths = extractPaths('Glob', {
      path: '/home/user/project',
      pattern: 'src/**/*.ts',
    });
    expect(paths).toContain('/home/user/project');
    expect(paths).toContain('src/');
  });

  it('returns empty array for unknown tool', () => {
    const paths = extractPaths('UnknownTool', { file_path: '/some/path' });
    expect(paths).toEqual([]);
  });
});

describe('fullPathValidatorHook', () => {
  it('allows absolute Unix paths', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Read',
      tool_input: { file_path: '/home/user/file.ts' },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('allows absolute Windows paths', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Write',
      tool_input: {
        file_path: 'C:\\Users\\codya\\file.ts',
        content: 'test',
      },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('blocks relative paths with helpful message', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Read',
      tool_input: { file_path: './src/index.ts' },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Relative file paths');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('./src/index.ts');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('→'); // Suggested path
  });

  it('allows non-file-operation tools', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('allows Glob with pure pattern (no path)', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Glob',
      tool_input: { pattern: '*.ts' },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('blocks Glob with relative path in pattern', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Glob',
      tool_input: { pattern: 'src/components/**/*.tsx' },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('src/components/');
  });

  it('allows Glob with absolute path', async () => {
    const result = await fullPathValidatorHook({
      tool_name: 'Glob',
      tool_input: {
        path: 'C:/Users/codya/project',
        pattern: '**/*.ts',
      },
    });

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
