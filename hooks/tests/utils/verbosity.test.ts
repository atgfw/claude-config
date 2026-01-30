/**
 * Verbosity System Tests
 * Tests for context-optimized output strategy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getVerbosity,
  setVerbosity,
  log,
  logTerse,
  logVerbose,
  logBlocked,
  logAllowed,
  logWarn,
  logInfo,
  logBatch,
} from '../../src/utils.js';

describe('Verbosity System', () => {
  const originalEnv = process.env['HOOK_VERBOSITY'];
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env['HOOK_VERBOSITY'];
    setVerbosity('terse'); // Reset to default
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalEnv) {
      process.env['HOOK_VERBOSITY'] = originalEnv;
    } else {
      delete process.env['HOOK_VERBOSITY'];
    }
  });

  describe('getVerbosity', () => {
    it('should return terse by default', () => {
      expect(getVerbosity()).toBe('terse');
    });

    it('should respect HOOK_VERBOSITY env var', () => {
      process.env['HOOK_VERBOSITY'] = 'verbose';
      expect(getVerbosity()).toBe('verbose');
    });

    it('should ignore invalid env values', () => {
      process.env['HOOK_VERBOSITY'] = 'invalid';
      expect(getVerbosity()).toBe('terse');
    });
  });

  describe('setVerbosity', () => {
    it('should change verbosity level', () => {
      setVerbosity('verbose');
      expect(getVerbosity()).toBe('verbose');
    });
  });

  describe('log (normal level)', () => {
    it('should not output in terse mode', () => {
      setVerbosity('terse');
      log('test message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output in normal mode', () => {
      setVerbosity('normal');
      log('test message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test message');
    });

    it('should output in verbose mode', () => {
      setVerbosity('verbose');
      log('test message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test message');
    });
  });

  describe('logTerse', () => {
    it('should not output in silent mode', () => {
      setVerbosity('silent');
      logTerse('test');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output in terse mode', () => {
      setVerbosity('terse');
      logTerse('test');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('logVerbose', () => {
    it('should not output in terse mode', () => {
      setVerbosity('terse');
      logVerbose('debug info');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not output in normal mode', () => {
      setVerbosity('normal');
      logVerbose('debug info');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output in verbose mode', () => {
      setVerbosity('verbose');
      logVerbose('debug info');
      expect(consoleErrorSpy).toHaveBeenCalledWith('debug info');
    });
  });

  describe('logBlocked', () => {
    it('should use terse format [X] in terse mode', () => {
      setVerbosity('terse');
      logBlocked('Missing file');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[X] Missing file');
    });

    it('should use verbose format in normal mode', () => {
      setVerbosity('normal');
      logBlocked('Missing file');
      expect(consoleErrorSpy).toHaveBeenCalledWith('');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BLOCKED] Missing file');
    });
  });

  describe('logAllowed', () => {
    it('should skip obvious success in terse mode', () => {
      setVerbosity('terse');
      logAllowed('Action allowed');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output notable success in terse mode', () => {
      setVerbosity('terse');
      logAllowed('3 files validated');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[+] 3 files validated');
    });

    it('should always output in normal mode', () => {
      setVerbosity('normal');
      logAllowed('Action allowed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[OK] Action allowed');
    });
  });

  describe('logWarn', () => {
    it('should use terse format [!] in terse mode', () => {
      setVerbosity('terse');
      logWarn('Deprecated pattern');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[!] Deprecated pattern');
    });

    it('should use verbose format in normal mode', () => {
      setVerbosity('normal');
      logWarn('Deprecated pattern');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WARN] Deprecated pattern');
    });
  });

  describe('logInfo', () => {
    it('should not output in terse mode', () => {
      setVerbosity('terse');
      logInfo('Processing...');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output in normal mode', () => {
      setVerbosity('normal');
      logInfo('Processing...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[--] Processing...');
    });
  });

  describe('logBatch', () => {
    it('should show count only in terse mode', () => {
      setVerbosity('terse');
      logBatch('Files', ['a.ts', 'b.ts', 'c.ts']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Files: 3');
    });

    it('should list items in normal mode', () => {
      setVerbosity('normal');
      logBatch('Files', ['a.ts', 'b.ts']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Files (2):');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  - a.ts');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  - b.ts');
    });

    it('should truncate long lists in normal mode', () => {
      setVerbosity('normal');
      logBatch('Files', ['a', 'b', 'c', 'd', 'e'], 3);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Files (5):');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  ... and 2 more');
    });

    it('should not output empty batches', () => {
      setVerbosity('terse');
      logBatch('Files', []);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
