/**
 * Quality Check Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PostToolUseInput, PostToolUseOutput } from '../src/types.js';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from(''));
      }),
    },
    stderr: {
      on: vi.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from(''));
      }),
    },
    on: vi.fn((event, cb) => {
      if (event === 'close') cb(0);
    }),
  })),
}));

describe('Quality Check Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Type Detection', () => {
    it('should skip non-source files', async () => {
      const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.md',
        },
      };

      const result = await qualityCheckHook(input);

      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.decision).toBeUndefined();
    });

    it('should skip non-write tools', async () => {
      const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

      const input: PostToolUseInput = {
        tool_name: 'Read',
        tool_input: {
          file_path: '/path/to/file.ts',
        },
      };

      const result = await qualityCheckHook(input);

      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.decision).toBeUndefined();
    });

    it('should handle missing file path', async () => {
      const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const result = await qualityCheckHook(input);

      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.decision).toBeUndefined();
    });
  });

  describe('Tool Matching', () => {
    // Built-in Claude Code tools
    const builtInTools = [
      { name: 'Write', pathKey: 'file_path' },
      { name: 'Edit', pathKey: 'file_path' },
      { name: 'MultiEdit', pathKey: 'file_path' },
      { name: 'NotebookEdit', pathKey: 'notebook_path' },
    ];

    builtInTools.forEach(({ name, pathKey }) => {
      it(`should process ${name} tool`, async () => {
        const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

        vi.mocked(fs.existsSync).mockReturnValue(false);

        const input: PostToolUseInput = {
          tool_name: name,
          tool_input: {
            [pathKey]: '/path/to/file.ts',
          },
        };

        const result = await qualityCheckHook(input);
        expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      });
    });

    // MCP tools
    const mcpTools = [
      { name: 'mcp__desktop-commander__write_file', pathKey: 'path' },
      { name: 'mcp__desktop-commander__edit_block', pathKey: 'file_path' },
      { name: 'mcp__morph__edit_file', pathKey: 'file_path' },
      { name: 'mcp__morph__write_file', pathKey: 'file_path' },
      { name: 'mcp__filesystem-with-morph__edit_file', pathKey: 'file_path' },
      { name: 'mcp__filesystem-with-morph__write_file', pathKey: 'file_path' },
      { name: 'mcp__filesystem__write_file', pathKey: 'path' },
      { name: 'mcp__filesystem__edit_file', pathKey: 'path' },
    ];

    mcpTools.forEach(({ name, pathKey }) => {
      it(`should process MCP tool ${name}`, async () => {
        const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

        vi.mocked(fs.existsSync).mockReturnValue(false);

        const input: PostToolUseInput = {
          tool_name: name,
          tool_input: {
            [pathKey]: '/path/to/file.ts',
          },
        };

        const result = await qualityCheckHook(input);
        expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      });
    });

    // Pattern-matched MCP tools (dynamic naming)
    it('should match MCP tools via pattern', async () => {
      const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const dynamicTools = [
        'mcp__custom-server__write_file',
        'mcp__my-filesystem__edit_file',
        'mcp__project-tools__edit_block',
        'mcp__dev-helper__create_file',
      ];

      for (const toolName of dynamicTools) {
        const input: PostToolUseInput = {
          tool_name: toolName,
          tool_input: {
            path: '/path/to/file.ts',
          },
        };

        const result = await qualityCheckHook(input);
        expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      }
    });
  });

  describe('Source File Detection', () => {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

    sourceExtensions.forEach((ext) => {
      it(`should recognize ${ext} as source file`, async () => {
        const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

        vi.mocked(fs.existsSync).mockReturnValue(false);

        const input: PostToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: `/path/to/file${ext}`,
          },
        };

        // The hook should attempt to process source files
        const result = await qualityCheckHook(input);
        expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      });
    });

    const nonSourceExtensions = ['.md', '.json', '.yaml', '.html', '.css'];

    nonSourceExtensions.forEach((ext) => {
      it(`should skip ${ext} as non-source file`, async () => {
        const { qualityCheckHook } = await import('../src/hooks/quality_check.js');

        const input: PostToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: `/path/to/file${ext}`,
          },
        };

        const result = await qualityCheckHook(input);

        // Should not block non-source files
        expect(result.hookSpecificOutput.decision).toBeUndefined();
      });
    });
  });
});
