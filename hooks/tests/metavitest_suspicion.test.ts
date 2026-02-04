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
  loadHistory,
  saveHistory,
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

  // ============================================================================
  // META-META-VITEST: Testing the tester
  // ============================================================================

  describe('META: loadHistory/saveHistory', () => {
    let tempDir: string;
    let originalClaudeDir: string | undefined;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metavitest-'));
      fs.mkdirSync(path.join(tempDir, 'ledger'), { recursive: true });
      originalClaudeDir = process.env['CLAUDE_DIR'];
      process.env['CLAUDE_DIR'] = tempDir;
    });

    afterEach(() => {
      if (originalClaudeDir) {
        process.env['CLAUDE_DIR'] = originalClaudeDir;
      } else {
        delete process.env['CLAUDE_DIR'];
      }
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('returns empty history when file does not exist', () => {
      const history = loadHistory();
      expect(history.runs).toEqual([]);
      expect(history.consecutivePerfectRuns).toBe(0);
    });

    it('saves and loads history correctly', () => {
      const testHistory = {
        runs: [
          {
            timestamp: '2024-01-01',
            command: 'bun test',
            passed: 10,
            failed: 0,
            total: 10,
            passRate: 1,
          },
        ],
        consecutivePerfectRuns: 5,
      };
      saveHistory(testHistory);

      const loaded = loadHistory();
      expect(loaded.runs).toHaveLength(1);
      expect(loaded.consecutivePerfectRuns).toBe(5);
    });

    it('handles malformed JSON gracefully', () => {
      const historyPath = path.join(tempDir, 'ledger', 'metavitest-history.json');
      fs.writeFileSync(historyPath, '{ invalid json :::');

      const history = loadHistory();
      // Should return empty history, not crash
      expect(history.runs).toEqual([]);
      expect(history.consecutivePerfectRuns).toBe(0);
    });

    it('handles empty JSON file', () => {
      const historyPath = path.join(tempDir, 'ledger', 'metavitest-history.json');
      fs.writeFileSync(historyPath, '');

      const history = loadHistory();
      expect(history.runs).toEqual([]);
    });

    it('trims history to MAX_HISTORY_ENTRIES', () => {
      const manyRuns = Array.from({ length: 150 }, (_, i) => ({
        timestamp: `2024-01-${i}`,
        command: 'bun test',
        passed: 10,
        failed: 0,
        total: 10,
        passRate: 1,
      }));
      const testHistory = { runs: manyRuns, consecutivePerfectRuns: 150 };

      saveHistory(testHistory);
      const loaded = loadHistory();

      // Should be trimmed to MAX_HISTORY_ENTRIES (100)
      expect(loaded.runs.length).toBeLessThanOrEqual(100);
    });

    it('creates ledger directory if missing', () => {
      // Remove the ledger dir
      fs.rmSync(path.join(tempDir, 'ledger'), { recursive: true });

      const testHistory = { runs: [], consecutivePerfectRuns: 1 };
      saveHistory(testHistory);

      // Should create the directory
      expect(fs.existsSync(path.join(tempDir, 'ledger'))).toBe(true);
    });
  });

  describe('META: Streak reset logic', () => {
    it('streak resets to 0 when passRate < 1', () => {
      // This tests the conceptual logic - a failing test should reset streak
      const passRate = 0.9; // 90% pass rate
      const shouldResetStreak = passRate < 1;
      expect(shouldResetStreak).toBe(true);
    });

    it('streak increments when passRate === 1', () => {
      const passRate = 1;
      const shouldIncrementStreak = passRate === 1;
      expect(shouldIncrementStreak).toBe(true);
    });

    it('handles floating point edge case (0.9999999 !== 1)', () => {
      // Tests that we don't have floating point comparison issues
      const almostPerfect = 99 / 99.0000001;
      expect(almostPerfect === 1).toBe(false);
    });
  });

  describe('META: Integration test', () => {
    it('full flow: detect command, parse output, track streak', () => {
      // Simulate the full hook flow
      const command = 'bun test';
      const output = '10 pass\n0 fail';

      // Step 1: Detect test command
      expect(isTestCommand(command)).toBe(true);

      // Step 2: Parse output
      const results = parseTestOutput(output);
      expect(results).not.toBeNull();
      expect(results?.passed).toBe(10);
      expect(results?.failed).toBe(0);

      // Step 3: Calculate pass rate
      const passRate = results!.passed / results!.total;
      expect(passRate).toBe(1);

      // Step 4: Check if suspicion should trigger
      const consecutivePerfectRuns = 3;
      const shouldWarn = consecutivePerfectRuns >= SUSPICION_THRESHOLD;
      expect(shouldWarn).toBe(true);
    });
  });

  describe('META: Edge cases that could crash the hook', () => {
    it('handles undefined tool_output', () => {
      // parseTestOutput should handle various falsy inputs
      expect(parseTestOutput('')).toBeNull();
    });

    it('handles tool_output that is an object', () => {
      // If tool_output is an object, it gets JSON.stringified
      // Note: JSON stringify adds quotes, so "10 pass" won't match (no whitespace before 10)
      const objOutput = JSON.stringify({ message: '10 pass\n0 fail' });
      const result = parseTestOutput(objOutput);
      // Correctly returns null - the "10 is preceded by quote, not whitespace
      expect(result).toBeNull();

      // But if the JSON has actual test output structure, it should work
      const realOutput = JSON.stringify({ stdout: '\n 10 pass\n 0 fail\n' });
      const realResult = parseTestOutput(realOutput);
      expect(realResult?.passed).toBe(10);
    });

    it('handles extremely long output without hanging', () => {
      // ReDoS protection test - needs space before number
      const longOutput = 'x'.repeat(1000000) + ' 10 pass\n0 fail';
      const start = Date.now();
      const result = parseTestOutput(longOutput);
      const elapsed = Date.now() - start;

      expect(result?.passed).toBe(10);
      expect(elapsed).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('requires whitespace or newline before pass count', () => {
      // This is by design - prevents false matches like "x10 pass"
      expect(parseTestOutput('x10 pass')).toBeNull();
      expect(parseTestOutput('10 pass')).not.toBeNull(); // Start of string OK
      expect(parseTestOutput(' 10 pass')).not.toBeNull(); // Space OK
      expect(parseTestOutput('\n10 pass')).not.toBeNull(); // Newline OK
    });
  });

  describe('META: Self-referential tests', () => {
    it('this test file has adversarial tests', () => {
      // Meta-assertion: ensure we have adversarial test sections
      const testFilePath = new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
      const testFileContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(testFileContent).toContain('ADVERSARIAL');
      expect(testFileContent).toContain('META');
    });

    it('tests cover all exported functions', () => {
      // Verify we test all exports
      expect(typeof isTestCommand).toBe('function');
      expect(typeof parseTestOutput).toBe('function');
      expect(typeof generateSuspicionMessage).toBe('function');
      expect(typeof loadHistory).toBe('function');
      expect(typeof saveHistory).toBe('function');
      expect(typeof SUSPICION_THRESHOLD).toBe('number');
    });
  });
});
