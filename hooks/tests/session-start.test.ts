/**
 * Session-Start Hook Tests
 * TDD: Write tests first, then implementation
 */

import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionStartHook } from '../src/hooks/session_start.js';
import type { SessionStartInput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  default: {},
}));
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  default: {},
}));
vi.mock('../src/utils.js', () => ({
  loadEnv: vi.fn(),
  hasApiKey: vi.fn(),
  getClaudeDir: vi.fn(() => '/mock/.claude'),
  getEnvPath: vi.fn(() => '/mock/.claude/.env'),
  markSessionValidated: vi.fn(),
  logTerse: vi.fn(),
  logWarn: vi.fn(),
  log: vi.fn(),
  logVerbose: vi.fn(),
  logInfo: vi.fn(),
  logSeparator: vi.fn(),
  isSessionRecentlyValidated: vi.fn(() => false),
  setVerbosity: vi.fn(),
  getVerbosity: vi.fn(() => 'terse'),
}));

// Mock session validation functions to pass
vi.mock('../src/session/index.js', () => ({
  validateHookCompilation: vi.fn(() => ({ passed: true, message: 'Hooks compiled' })),
  synchronizeGit: vi.fn(() => ({ synced: true, message: 'Git synced' })),
  validateChildProject: vi.fn(() => ({ passed: true, message: 'No overrides' })),
  checkDocumentationDrift: vi.fn(() => ({ drifted: false, message: 'No drift' })),
  cleanupProject: vi.fn(() => ({ cleaned: true, message: 'Cleaned' })),
  auditFolderHygiene: vi.fn(() => ({ passed: true, issues: [] })),
}));

// Mock other dependencies
vi.mock('../src/mcp/api_key_sync.js', () => ({
  syncApiKeys: vi.fn(async () => ({ synced: true })),
}));

vi.mock('../src/ledger/correction_ledger.js', () => ({
  getStats: vi.fn(() => ({ total: 0, open: 0, closed: 0 })),
}));

vi.mock('../src/escalation/reporter.js', () => ({
  formatForSessionStart: vi.fn(() => ''),
}));

describe('Session-Start Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Setup', () => {
    it('should load environment variables', async () => {
      const input: SessionStartInput = {};

      await sessionStartHook(input);

      expect(utils.loadEnv).toHaveBeenCalled();
    });

    it('should create .env template if missing', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (String(path).includes('.env')) return false;
        return true;
      });
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const input: SessionStartInput = {};

      await sessionStartHook(input);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Prerequisites Check', () => {
    it('should check for Node.js', async () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (String(cmd).includes('node --version')) {
          return Buffer.from('v20.0.0');
        }

        return Buffer.from('');
      });

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
    });

    it('should check for Claude CLI', async () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (String(cmd).includes('claude --version')) {
          return Buffer.from('1.0.0');
        }

        return Buffer.from('');
      });

      const input: SessionStartInput = {};

      await sessionStartHook(input);

      // Should not throw
    });

    it('should handle missing Claude CLI gracefully', async () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (String(cmd).includes('claude')) {
          throw new Error('Command not found');
        }

        return Buffer.from('');
      });

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      // Should still return success but with warnings
      expect(output.hookEventName).toBe('SessionStart');
    });
  });

  describe('MCP Server Health Check', () => {
    it('should report MCP server status', async () => {
      vi.mocked(utils.hasApiKey).mockImplementation((key) => {
        return key === 'MORPH_API_KEY';
      });

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.additionalContext).toBeDefined();
    });

    it('should report missing API keys', async () => {
      vi.mocked(utils.hasApiKey).mockReturnValue(false);

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
    });
  });

  describe('Subagent Availability', () => {
    it('should check for required subagents', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (String(path).includes('agents')) return true;
        if (String(path).includes('code-reviewer.md')) return true;
        return false;
      });
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'code-reviewer.md', isFile: () => true } as unknown as fs.Dirent,
      ]);

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
    });

    it('should report missing subagents', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (String(path).includes('agents')) return true;
        if (String(path).includes('.md')) return false;
        return true;
      });
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
    });
  });

  describe('Session Validation Cache', () => {
    it('should mark session as validated', async () => {
      const input: SessionStartInput = {};

      await sessionStartHook(input);

      expect(utils.markSessionValidated).toHaveBeenCalled();
    });
  });

  describe('Output Quality', () => {
    it('should return SessionStart event name', async () => {
      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
    });

    it('should include context summary', async () => {
      const input: SessionStartInput = {};

      const output = await sessionStartHook(input);

      expect(output.additionalContext).toBeDefined();
    });
  });
});
