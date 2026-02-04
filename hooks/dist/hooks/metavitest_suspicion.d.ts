/**
 * Metavitest Suspicion Hook
 * Detects 100% test pass rates and injects warnings about insufficient test challenge
 * Issue #32: Raise suspicion when all tests pass
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
interface TestRunRecord {
    timestamp: string;
    command: string;
    passed: number;
    failed: number;
    total: number;
    passRate: number;
    file?: string;
}
interface TestHistory {
    runs: TestRunRecord[];
    consecutivePerfectRuns: number;
    lastSuspicionWarning?: string;
}
declare const SUSPICION_THRESHOLD = 3;
/**
 * Detect if this is a test command
 */
declare function isTestCommand(command: string): boolean;
/**
 * Parse test output for pass/fail counts
 * Supports bun test, vitest, jest output formats
 */
declare function parseTestOutput(output: string): {
    passed: number;
    failed: number;
    total: number;
} | null;
/**
 * Load test history from ledger
 */
declare function loadHistory(): TestHistory;
/**
 * Save test history to ledger
 */
declare function saveHistory(history: TestHistory): void;
/**
 * Generate suspicion message
 */
declare function generateSuspicionMessage(history: TestHistory, latestRun: TestRunRecord): string;
/**
 * Metavitest Suspicion Hook Implementation
 */
declare function metavitestSuspicion(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default metavitestSuspicion;
export { isTestCommand, parseTestOutput, loadHistory, saveHistory, generateSuspicionMessage, SUSPICION_THRESHOLD, };
//# sourceMappingURL=metavitest_suspicion.d.ts.map