/**
 * Metavitest Suspicion Hook
 * Detects 100% test pass rates and injects warnings about insufficient test challenge
 * Issue #32: Raise suspicion when all tests pass
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logTerse, logWarn, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
const HISTORY_FILE = 'metavitest-history.json';
const SUSPICION_THRESHOLD = 3; // Consecutive 100% runs before warning
const MAX_HISTORY_ENTRIES = 100;
/**
 * Detect if this is a test command
 */
function isTestCommand(command) {
    const testPatterns = [
        /\bbun\s+test\b/i,
        /\bvitest\b/i,
        /\bjest\b/i,
        /\bmocha\b/i,
        /\bnpm\s+test\b/i,
        /\bnpm\s+run\s+test\b/i,
        /\bbun\s+run\s+test\b/i,
    ];
    return testPatterns.some((p) => p.test(command));
}
/**
 * Parse test output for pass/fail counts
 * Supports bun test, vitest, jest output formats
 */
function parseTestOutput(output) {
    // Strip ANSI escape codes first (ESC [ ... m sequences)
    const ansiPattern = new RegExp(String.fromCharCode(0x1b) + '\\[[0-9;]*m', 'g');
    const cleanOutput = output.replace(ansiPattern, '');
    // Bun test format: "61 pass" on one line, "0 fail" on another
    // Use word boundary \b to avoid matching "-5 pass" (the 5 is preceded by -)
    const passMatch = cleanOutput.match(/(?:^|\s)(\d+)\s+pass\b/im);
    const failMatch = cleanOutput.match(/(?:^|\s)(\d+)\s+fail\b/im);
    if (passMatch) {
        const passed = Number.parseInt(passMatch[1] ?? '0', 10);
        const failed = failMatch ? Number.parseInt(failMatch[1] ?? '0', 10) : 0;
        return { passed, failed, total: passed + failed };
    }
    // Vitest format: "Tests: 5 passed, 2 failed, 7 total"
    const vitestMatch = output.match(/Tests?:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*total)?/i);
    if (vitestMatch) {
        const passed = Number.parseInt(vitestMatch[1] ?? '0', 10);
        const failed = Number.parseInt(vitestMatch[2] ?? '0', 10);
        const total = Number.parseInt(vitestMatch[3] ?? '0', 10) || passed + failed;
        return { passed, failed, total };
    }
    // Jest format: "Tests: 5 passed, 5 total"
    const jestMatch = output.match(/(\d+)\s+passed,\s+(\d+)\s+total/i);
    if (jestMatch) {
        const passed = Number.parseInt(jestMatch[1] ?? '0', 10);
        const total = Number.parseInt(jestMatch[2] ?? '0', 10);
        return { passed, failed: total - passed, total };
    }
    // Alternative: "X tests passed" or "all X tests passed"
    const simpleMatch = output.match(/(?:all\s+)?(\d+)\s+tests?\s+passed/i);
    if (simpleMatch) {
        const passed = Number.parseInt(simpleMatch[1] ?? '0', 10);
        return { passed, failed: 0, total: passed };
    }
    return null;
}
/**
 * Load test history from ledger
 */
function loadHistory() {
    const historyPath = path.join(getClaudeDir(), 'ledger', HISTORY_FILE);
    if (!fs.existsSync(historyPath)) {
        return { runs: [], consecutivePerfectRuns: 0 };
    }
    try {
        const content = fs.readFileSync(historyPath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return { runs: [], consecutivePerfectRuns: 0 };
    }
}
/**
 * Save test history to ledger
 */
function saveHistory(history) {
    const ledgerDir = path.join(getClaudeDir(), 'ledger');
    if (!fs.existsSync(ledgerDir)) {
        fs.mkdirSync(ledgerDir, { recursive: true });
    }
    const historyPath = path.join(ledgerDir, HISTORY_FILE);
    // Trim old entries
    if (history.runs.length > MAX_HISTORY_ENTRIES) {
        history.runs = history.runs.slice(-MAX_HISTORY_ENTRIES);
    }
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}
/**
 * Generate suspicion message
 */
function generateSuspicionMessage(history, latestRun) {
    const recentRuns = history.runs.slice(-5);
    const avgTests = recentRuns.reduce((sum, r) => sum + r.total, 0) / recentRuns.length;
    const message = `**METAVITEST SUSPICION WARNING**

**${history.consecutivePerfectRuns} consecutive test runs with 100% pass rate.**

This raises suspicion that tests may not be challenging enough.

**Latest run:** ${latestRun.passed} passed, ${latestRun.failed} failed (${latestRun.total} total)
**Average test count:** ${avgTests.toFixed(0)} tests

**Recommended actions:**
1. Add adversarial tests for edge cases
2. Test boundary conditions (empty input, max values, null)
3. Add Unicode/encoding attack tests
4. Test error paths and exception handling
5. Add ReDoS resistance tests for regex patterns
6. Test concurrent/race condition scenarios
7. Add mutation testing to verify test quality

**A healthy test suite should occasionally fail during development.**
If tests never fail, they may not be catching real bugs.`;
    return message;
}
/**
 * Metavitest Suspicion Hook Implementation
 */
async function metavitestSuspicion(input) {
    // Only process Bash commands
    if (input.tool_name !== 'Bash') {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const toolInput = input.tool_input;
    const command = toolInput?.command ?? '';
    // Only process test commands
    if (!isTestCommand(command)) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Parse output
    const output = typeof input.tool_output === 'string' ? input.tool_output : JSON.stringify(input.tool_output);
    const results = parseTestOutput(output);
    if (!results || results.total === 0) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Load history
    const history = loadHistory();
    // Record this run
    const passRate = results.total > 0 ? results.passed / results.total : 0;
    const record = {
        timestamp: new Date().toISOString(),
        command,
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        passRate,
    };
    history.runs.push(record);
    // Update consecutive perfect runs
    if (passRate === 1) {
        history.consecutivePerfectRuns++;
        logTerse(`[+] Test run: ${results.passed}/${results.total} passed (streak: ${history.consecutivePerfectRuns})`);
    }
    else {
        history.consecutivePerfectRuns = 0;
        logTerse(`[+] Test run: ${results.passed}/${results.total} passed, ${results.failed} failed`);
    }
    // Save history
    saveHistory(history);
    // Check if we should raise suspicion
    if (history.consecutivePerfectRuns >= SUSPICION_THRESHOLD) {
        logWarn(`Metavitest: ${history.consecutivePerfectRuns} consecutive 100% pass runs`);
        const suspicionMessage = generateSuspicionMessage(history, record);
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: suspicionMessage,
            },
        };
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
registerHook('metavitest-suspicion', 'PostToolUse', metavitestSuspicion);
export default metavitestSuspicion;
// Export for testing
export { isTestCommand, parseTestOutput, loadHistory, saveHistory, generateSuspicionMessage, SUSPICION_THRESHOLD, };
//# sourceMappingURL=metavitest_suspicion.js.map