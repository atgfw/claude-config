/**
 * Tests for metavitest_suspicion hook
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  isTestCommand,
  parseTestOutput,
  generateSuspicionMessage,
  SUSPICION_THRESHOLD,
} from '../src/hooks/metavitest_suspicion.js';

describe('metavitest_suspicion', () => {
  describe('isTestCommand', () => {
    it('detects bun test', () => {
      expect(isTestCommand('bun test')).toBe(true);
      expect(isTestCommand('bun test credential')).toBe(true);
      expect(isTestCommand('cd foo && bun test')).toBe(true);
    });

    it('detects vitest', () => {
      expect(isTestCommand('vitest')).toBe(true);
      expect(isTestCommand('vitest run')).toBe(true);
      expect(isTestCommand('npx vitest')).toBe(true);
    });

    it('detects jest', () => {
      expect(isTestCommand('jest')).toBe(true);
      expect(isTestCommand('npx jest')).toBe(true);
      expect(isTestCommand('jest --coverage')).toBe(true);
    });

    it('detects npm test', () => {
      expect(isTestCommand('npm test')).toBe(true);
      expect(isTestCommand('npm run test')).toBe(true);
    });

    it('does not trigger on non-test commands', () => {
      expect(isTestCommand('bun run build')).toBe(false);
      expect(isTestCommand('npm install')).toBe(false);
      expect(isTestCommand('echo test')).toBe(false);
      expect(isTestCommand('git commit -m "test"')).toBe(false);
    });
  });

  describe('parseTestOutput', () => {
    it('parses bun test output', () => {
      const output = `bun test v1.3.6 (d530ed99)

 61 pass
 0 fail
 147 expect() calls
Ran 61 tests across 1 file. [621.00ms]`;

      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 61, failed: 0, total: 61 });
    });

    it('parses bun test with failures', () => {
      const output = `bun test v1.3.6

 23 pass
 2 fail
 86 expect() calls`;

      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 23, failed: 2, total: 25 });
    });

    it('parses vitest output', () => {
      const output = 'Tests: 10 passed, 2 failed, 12 total';
      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 10, failed: 2, total: 12 });
    });

    it('parses jest output', () => {
      const output = 'Tests: 5 passed, 5 total';
      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 5, failed: 0, total: 5 });
    });

    it('parses simple "X tests passed" format', () => {
      const output = 'all 25 tests passed';
      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 25, failed: 0, total: 25 });
    });

    it('returns null for non-test output', () => {
      expect(parseTestOutput('Hello world')).toBeNull();
      expect(parseTestOutput('Build succeeded')).toBeNull();
      expect(parseTestOutput('')).toBeNull();
    });

    it('handles multiline output with extra content', () => {
      const output = `
$ bun run clean
$ rimraf dist
$ tsc
bun test v1.3.6

 25 pass
 0 fail
Ran 25 tests
`;
      const result = parseTestOutput(output);
      expect(result?.passed).toBe(25);
      expect(result?.failed).toBe(0);
    });
  });

  describe('generateSuspicionMessage', () => {
    it('includes warning header', () => {
      const history = {
        runs: [{ timestamp: '', command: '', passed: 10, failed: 0, total: 10, passRate: 1 }],
        consecutivePerfectRuns: 5,
      };
      const latestRun = {
        timestamp: '',
        command: '',
        passed: 10,
        failed: 0,
        total: 10,
        passRate: 1,
      };

      const message = generateSuspicionMessage(history, latestRun);
      expect(message).toContain('METAVITEST SUSPICION WARNING');
      expect(message).toContain('5 consecutive');
    });

    it('includes recommended actions', () => {
      const history = { runs: [], consecutivePerfectRuns: 3 };
      const latestRun = {
        timestamp: '',
        command: '',
        passed: 10,
        failed: 0,
        total: 10,
        passRate: 1,
      };

      const message = generateSuspicionMessage(history, latestRun);
      expect(message).toContain('adversarial');
      expect(message).toContain('boundary');
      expect(message).toContain('Unicode');
    });

    it('includes statistics', () => {
      const history = {
        runs: [
          { timestamp: '', command: '', passed: 10, failed: 0, total: 10, passRate: 1 },
          { timestamp: '', command: '', passed: 20, failed: 0, total: 20, passRate: 1 },
        ],
        consecutivePerfectRuns: 2,
      };
      const latestRun = {
        timestamp: '',
        command: '',
        passed: 20,
        failed: 0,
        total: 20,
        passRate: 1,
      };

      const message = generateSuspicionMessage(history, latestRun);
      expect(message).toContain('20 passed');
      expect(message).toContain('Average test count');
    });
  });

  describe('SUSPICION_THRESHOLD', () => {
    it('is a reasonable value', () => {
      expect(SUSPICION_THRESHOLD).toBeGreaterThanOrEqual(2);
      expect(SUSPICION_THRESHOLD).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // ADVERSARIAL TESTS
  // ============================================================================

  describe('ADVERSARIAL: parseTestOutput edge cases', () => {
    it('handles extremely large numbers', () => {
      const output = '999999 pass\n0 fail';
      const result = parseTestOutput(output);
      expect(result?.passed).toBe(999999);
    });

    it('handles output with ANSI color codes', () => {
      const output = '\u001B[32m25 pass\u001B[0m\n\u001B[31m0 fail\u001B[0m';
      const result = parseTestOutput(output);
      expect(result?.passed).toBe(25);
    });

    it('handles multiple test result lines (takes first)', () => {
      const output = '10 pass\n0 fail\n20 pass\n5 fail';
      const result = parseTestOutput(output);
      // Should get first match
      expect(result?.passed).toBe(10);
    });

    it('handles "pass" in other contexts', () => {
      // "password" contains "pass" but shouldn't match
      const output = 'Testing password validation\nBuild complete';
      const result = parseTestOutput(output);
      expect(result).toBeNull();
    });

    it('handles zero tests', () => {
      const output = '0 pass\n0 fail';
      const result = parseTestOutput(output);
      expect(result).toEqual({ passed: 0, failed: 0, total: 0 });
    });

    it('handles negative numbers gracefully', () => {
      // Invalid but should not crash
      const output = '-5 pass\n0 fail';
      const result = parseTestOutput(output);
      // Should not match negative
      expect(result).toBeNull();
    });
  });

  describe('ADVERSARIAL: isTestCommand edge cases', () => {
    it('does not match "contest" or "attest"', () => {
      expect(isTestCommand('run the contest')).toBe(false);
      expect(isTestCommand('attest the signature')).toBe(false);
    });

    it('handles commands with special characters', () => {
      expect(isTestCommand('bun test "file with spaces.ts"')).toBe(true);
      expect(isTestCommand("bun test 'quoted'")).toBe(true);
    });

    it('handles newlines in command', () => {
      expect(isTestCommand('bun test\n--watch')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isTestCommand('BUN TEST')).toBe(true);
      expect(isTestCommand('Bun Test')).toBe(true);
    });
  });

  describe('ADVERSARIAL: generateSuspicionMessage edge cases', () => {
    it('handles empty runs array', () => {
      const history = { runs: [], consecutivePerfectRuns: 5 };
      const latestRun = {
        timestamp: '',
        command: '',
        passed: 10,
        failed: 0,
        total: 10,
        passRate: 1,
      };

      // Should not crash with division by zero
      const message = generateSuspicionMessage(history, latestRun);
      expect(message.length).toBeGreaterThan(0);
    });

    it('handles very long streak', () => {
      const history = { runs: [], consecutivePerfectRuns: 1000000 };
      const latestRun = {
        timestamp: '',
        command: '',
        passed: 10,
        failed: 0,
        total: 10,
        passRate: 1,
      };

      const message = generateSuspicionMessage(history, latestRun);
      expect(message).toContain('1000000');
    });
  });
});
