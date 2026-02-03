/**
 * Full Path Validator Hook
 *
 * Enforces that all file paths in Claude Code operations are absolute (full) paths.
 * Relative paths cause ambiguity when cwd changes and make audit logs inconsistent.
 *
 * GitHub Issue: #31
 * Trigger: PreToolUse on Read, Write, Edit, Glob, Grep
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Check if a path is absolute.
 * Handles both Unix (/path) and Windows (C:\path, D:/path) formats.
 */
declare function isAbsolutePath(filePath: string): boolean;
/**
 * Expand a relative path to absolute using cwd.
 */
declare function expandToAbsolute(relativePath: string): string;
/**
 * Extract file paths from tool input.
 */
declare function extractPaths(toolName: string, toolInput: Record<string, unknown>): string[];
/**
 * PreToolUse hook - validate file paths are absolute.
 */
declare function fullPathValidator(input: PreToolUseInput): Promise<PreToolUseOutput>;
export { fullPathValidator as fullPathValidatorHook, isAbsolutePath, expandToAbsolute, extractPaths, };
export default fullPathValidator;
//# sourceMappingURL=full_path_validator.d.ts.map