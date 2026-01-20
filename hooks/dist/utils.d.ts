/**
 * Hook Utilities
 * Common functions for all hooks
 */
/**
 * Get the Claude configuration directory
 * Uses CLAUDE_DIR env var or defaults to ~/.claude
 */
export declare function getClaudeDir(): string;
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
 * Log diagnostic information to stderr
 * This is visible to users but doesn't interfere with JSON output
 */
export declare function log(message: string): void;
/**
 * Log a separator line
 */
export declare function logSeparator(title: string): void;
/**
 * Log an error with context
 */
export declare function logError(error: Error, context?: string): void;
/**
 * Log a blocked action
 */
export declare function logBlocked(reason: string, directive?: string): void;
/**
 * Log an allowed action
 */
export declare function logAllowed(message?: string): void;
/**
 * Check if a string contains emojis
 */
export declare function containsEmoji(text: string): boolean;
/**
 * Check if a command contains deletion commands
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