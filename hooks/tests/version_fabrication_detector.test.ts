/**
 * Tests for Version Fabrication Detector Hook
 *
 * Tests the pure detection functions. Integration tests with fs mocking
 * are not possible in bun's test runner due to read-only module exports.
 */

import { describe, it, expect } from 'vitest';
import {
  detectFabricatedVersions,
  detectFilenameVersioning,
  versionFabricationDetectorHook,
} from '../src/hooks/version_fabrication_detector.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Version Fabrication Detector', () => {
  describe('detectFabricatedVersions', () => {
    describe('should detect fabricated version patterns', () => {
      it('detects _v1, _v2 suffixes', () => {
        const result = detectFabricatedVersions('function handler_v2() {}');
        expect(result.found).toBe(true);
        expect(result.patterns).toContain('handler_v2');
      });

      it('detects -v1, -v2 suffixes', () => {
        const result = detectFabricatedVersions('const config-v3 = {}');
        expect(result.found).toBe(true);
      });

      it('detects _new suffix', () => {
        const result = detectFabricatedVersions('function processData_new() {}');
        expect(result.found).toBe(true);
        expect(result.patterns).toContain('processData_new');
      });

      it('detects _old suffix', () => {
        const result = detectFabricatedVersions('const settings_old = {}');
        expect(result.found).toBe(true);
      });

      it('detects _backup suffix', () => {
        const result = detectFabricatedVersions('let data_backup = []');
        expect(result.found).toBe(true);
      });

      it('detects _copy suffix', () => {
        const result = detectFabricatedVersions('class Handler_copy {}');
        expect(result.found).toBe(true);
      });

      it('detects numeric suffixes like _1, _2', () => {
        const result = detectFabricatedVersions('function process_1() {}');
        expect(result.found).toBe(true);
      });

      it('detects trailing numbers like handler2', () => {
        const result = detectFabricatedVersions('function handler2() {}');
        expect(result.found).toBe(true);
      });

      it('detects _draft suffix', () => {
        const result = detectFabricatedVersions('const spec_draft = {}');
        expect(result.found).toBe(true);
      });

      it('detects _final suffix', () => {
        const result = detectFabricatedVersions('let result_final = null');
        expect(result.found).toBe(true);
      });

      it('detects _temp suffix', () => {
        const result = detectFabricatedVersions('var buffer_temp = []');
        expect(result.found).toBe(true);
      });

      it('detects _rev1 suffix', () => {
        const result = detectFabricatedVersions('const doc_rev1 = {}');
        expect(result.found).toBe(true);
      });
    });

    describe('should NOT detect canonical exceptions', () => {
      it('allows oauth2', () => {
        const result = detectFabricatedVersions('const oauth2Config = {}');
        expect(result.found).toBe(false);
      });

      it('allows base64', () => {
        const result = detectFabricatedVersions('function encodeBase64() {}');
        expect(result.found).toBe(false);
      });

      it('allows sha256', () => {
        const result = detectFabricatedVersions('const sha256Hash = ""');
        expect(result.found).toBe(false);
      });

      it('allows es6', () => {
        const result = detectFabricatedVersions('// ES6 module syntax');
        expect(result.found).toBe(false);
      });

      it('allows utf8', () => {
        const result = detectFabricatedVersions('const utf8Encoding = "utf8"');
        expect(result.found).toBe(false);
      });

      it('allows ipv4', () => {
        const result = detectFabricatedVersions('function parseIpv4() {}');
        expect(result.found).toBe(false);
      });

      it('allows http2', () => {
        const result = detectFabricatedVersions('const http2Server = {}');
        expect(result.found).toBe(false);
      });

      it('allows 2fa', () => {
        const result = detectFabricatedVersions('function setup2fa() {}');
        expect(result.found).toBe(false);
      });

      it('allows aes256', () => {
        const result = detectFabricatedVersions('const aes256Cipher = null');
        expect(result.found).toBe(false);
      });

      it('allows vue3', () => {
        const result = detectFabricatedVersions('import { ref } from "vue3"');
        expect(result.found).toBe(false);
      });
    });

    describe('should handle clean code', () => {
      it('allows normal function names', () => {
        const result = detectFabricatedVersions('function processData() {}');
        expect(result.found).toBe(false);
      });

      it('allows snake_case names', () => {
        const result = detectFabricatedVersions('const user_settings = {}');
        expect(result.found).toBe(false);
      });

      it('allows camelCase names', () => {
        const result = detectFabricatedVersions('let userName = ""');
        expect(result.found).toBe(false);
      });

      it('allows PascalCase class names', () => {
        const result = detectFabricatedVersions('class UserHandler {}');
        expect(result.found).toBe(false);
      });
    });
  });

  describe('detectFilenameVersioning', () => {
    it('detects _v2 in filename', () => {
      const result = detectFilenameVersioning('handler_v2');
      expect(result.found).toBe(true);
      expect(result.patterns).toContain('handler_v2');
    });

    it('detects _new in filename', () => {
      const result = detectFilenameVersioning('config_new');
      expect(result.found).toBe(true);
    });

    it('detects _backup in filename', () => {
      const result = detectFilenameVersioning('data_backup');
      expect(result.found).toBe(true);
    });

    it('allows clean filenames', () => {
      const result = detectFilenameVersioning('handler');
      expect(result.found).toBe(false);
    });

    it('allows canonical filenames', () => {
      const result = detectFilenameVersioning('oauth2_client');
      expect(result.found).toBe(false);
    });
  });

  describe('versionFabricationDetectorHook', () => {
    describe('Write operations', () => {
      it('blocks Write with fabricated version in content', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/handler.ts',
            content: 'function processData_v2() { return true; }',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
        expect(result.hookSpecificOutput.permissionDecisionReason).toContain(
          'Fabricated versioning'
        );
      });

      it('blocks Write with fabricated version in filename', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/handler_v2.ts',
            content: 'export default function() {}',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      });

      it('allows Write with clean code', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/handler.ts',
            content: 'function processData() { return true; }',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });

      it('allows Write with canonical terms', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Write',
          tool_input: {
            file_path: '/test/auth.ts',
            content: 'const oauth2Config = { clientId: "123" };',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });
    });

    describe('Edit operations', () => {
      it('blocks Edit with fabricated version in new_string', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Edit',
          tool_input: {
            file_path: '/test/handler.ts',
            old_string: 'function old() {}',
            new_string: 'function handler_new() {}',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      });

      it('allows Edit with clean replacement', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Edit',
          tool_input: {
            file_path: '/test/handler.ts',
            old_string: 'function old() {}',
            new_string: 'function updated() {}',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });
    });

    describe('Non-file operations', () => {
      it('allows Read operations', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Read',
          tool_input: {
            file_path: '/test/handler_v2.ts',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });

      it('allows Glob operations', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Glob',
          tool_input: {
            pattern: '**/*_v2.ts',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });
    });

    describe('Bash operations', () => {
      it('allows Bash commands with stderr redirect (not a file write)', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Bash',
          tool_input: {
            command:
              'gh issue close 22 --reason completed --comment "Migration to LLM Extractor categories is complete." 2>&1',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
        expect(result.hookSpecificOutput.permissionDecisionReason).toBe(
          'Not a file write operation'
        );
      });

      it('allows Bash commands without file redirects', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Bash',
          tool_input: {
            command: 'git status',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });

      it('allows Bash with words containing cat/echo as substrings', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Bash',
          tool_input: {
            command: 'gh issue list --label "categories" 2>&1',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      });

      it('still blocks actual echo file writes with version patterns', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Bash',
          tool_input: {
            command: 'echo "function handler_v2() {}" > /tmp/test.ts',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      });

      it('still blocks cat heredoc writes with version patterns', async () => {
        const input: PreToolUseInput = {
          tool_name: 'Bash',
          tool_input: {
            command: 'cat << EOF > /tmp/config_v2.json\n{"key": "value"}\nEOF',
          },
        };

        const result = await versionFabricationDetectorHook(input);
        expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      });
    });

    // Note: Tests for "Project with existing versioning" and "File already has versioning"
    // are skipped because bun's test runner doesn't allow mocking node:fs module exports.
    // These behaviors are tested manually or via integration tests.
  });
});
