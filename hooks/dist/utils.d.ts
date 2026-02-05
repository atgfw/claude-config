/**
 * Hook Utilities
 * Common functions for all hooks
 */
import type { VerbosityLevel } from './types.js';
/**
 * Get the Claude configuration directory
 * Uses CLAUDE_DIR env var or defaults to ~/.claude
 */
export declare function getClaudeDir(): string;
/**
 * Check if two paths represent the same location or have a parent-child relationship.
 * Uses proper path resolution to avoid substring matching bugs.
 *
 * Examples:
 * - isPathMatch('/projects/myapp', '/projects/myapp') => true (exact match)
 * - isPathMatch('/projects/myapp/src', '/projects/myapp') => true (child of)
 * - isPathMatch('/projects/myapp', '/projects/myapp/src') => true (parent of)
 * - isPathMatch('/projects/myapp', '/projects/myapp2') => false (sibling, NOT substring)
 *
 * @param pathA - First path to compare
 * @param pathB - Second path to compare
 * @returns true if paths match or have parent-child relationship
 */
export declare function isPathMatch(pathA: string, pathB: string): boolean;
/**
 * Get the hooks directory
 */
export declare function getHooksDir(): string;
/**
 * Get the old/ archive directory (for deletion ban compliance)
 */
export declare function getOldDir(): string;
/**
 * Get the .env file path
 */
export declare function getEnvPath(): string;
/**
 * Move a file to the old/ directory instead of deleting
 * Complies with the deletion ban directive
 */
export declare function archiveFile(filePath: string): void;
/**
 * Check if a flag file exists
 */
export declare function flagExists(flagName: string): boolean;
/**
 * Create a flag file
 */
export declare function createFlag(flagName: string): void;
/**
 * Archive a flag file (instead of deleting)
 */
export declare function setFlag(flagName: string): void;
/**
 * Archive a flag file (instead of deleting)
 */
export declare function archiveFlag(flagName: string): void;
/**
 * Load environment variables from .env file
 */
export declare function loadEnv(): void;
/**
 * Check if an API key is configured
 */
export declare function hasApiKey(keyName: string): boolean;
/**
 * Read JSON from stdin
 * Hooks receive input as JSON via stdin
 */
export declare function readStdin(): Promise<string>;
/**
 * Parse JSON safely with type checking
 */
export declare function parseJson<T>(json: string): T | null;
/**
 * Output JSON to stdout for Claude Code
 */
export declare function outputJson(data: unknown): void;
/**
 * Get current verbosity level from environment or config
 */
export declare function getVerbosity(): VerbosityLevel;
/**
 * Set verbosity level programmatically
 */
export declare function setVerbosity(level: VerbosityLevel): void;
/**
 * Log diagnostic information to stderr
 * This is visible to users but doesn't interfere with JSON output
 */
export declare function log(message: string): void;
/**
 * Terse log - always outputs regardless of verbosity (except silent)
 * Use for critical information only
 */
export declare function logTerse(message: string): void;
/**
 * Verbose log - only outputs in verbose mode
 * Use for debugging details
 */
export declare function logVerbose(message: string): void;
/**
 * Log a separator line (only in normal/verbose mode)
 */
export declare function logSeparator(title: string): void;
/**
 * Log an error - terse format for production, detailed for verbose
 */
export declare function logError(error: Error, context?: string): void;
/**
 * Log a blocked action - terse format minimizes context usage
 */
export declare function logBlocked(reason: string, directive?: string): void;
/**
 * Log an allowed action
 */
export declare function logAllowed(message?: string): void;
/**
 * Log a warning - always shows but format varies by verbosity
 */
export declare function logWarn(message: string, details?: string): void;
/**
 * Log info - skipped in terse mode
 */
export declare function logInfo(message: string): void;
/**
 * Batch log multiple items efficiently
 * In terse mode, outputs count only. In normal/verbose, lists items.
 */
export declare function logBatch(prefix: string, items: string[], maxShow?: number): void;
/**
 * Check if a string contains emojis
 */
export declare function containsEmoji(text: string): boolean;
/**
 * Check if a command contains deletion commands
 * Blocks: rm, del, Remove-Item, rmdir, rd, unlink, shred, find -delete, git clean
 */
export declare function containsDeletionCommand(command: string): boolean;
/**
 * Extract file extension from path
 */
export declare function getFileExtension(filePath: string): string;
/**
 * Check if a file is a code file
 */
export declare function isCodeFile(filePath: string): boolean;
/**
 * Check if session was recently validated (compact mode)
 * Returns true if validation flag exists and is less than 1 hour old
 */
export declare function isSessionRecentlyValidated(): boolean;
/**
 * Mark session as validated
 */
export declare function markSessionValidated(): void;
/**
 * Archive a file to old/YYYY-MM-DD/ directory
 * Never deletes - always moves to preserve history
 * @param filePath - Path to file to archive
 * @param baseDirectory - Optional base directory for relative old/ folder
 * @returns Archive path if successful, null otherwise
 */
export declare function archiveToDateDir(filePath: string, baseDirectory?: string): string | null;
/**
 * Check if Morph MCP is available
 */
export declare function isMorphAvailable(): boolean;
/**
 * Get MCP server health from the registry
 * Returns the health status or 'unknown' if not found
 */
export declare function getMcpServerHealth(serverName: string): 'healthy' | 'degraded' | 'failed' | 'unknown';
/**
 * Check if an MCP server is configured (exists in .mcp.json)
 */
export declare function isMcpServerConfigured(serverName: string): boolean;
/**
 * Check if Scrapling MCP is available AND healthy
 * Now checks live health status from MCP registry
 */
export declare function isScraplingAvailable(): boolean;
/**
 * Check if Scrapling MCP is configured (regardless of health)
 * Use this for soft checks where we want to prefer Scrapling but allow fallback
 */
export declare function isScraplingConfigured(): boolean;
/**
 * Check if Playwright MCP is available AND healthy
 */
export declare function isPlaywrightAvailable(): boolean;
//# sourceMappingURL=utils.d.ts.map