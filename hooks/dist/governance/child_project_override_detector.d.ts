/**
 * Child Project Override Detector
 *
 * PREVENTS child projects from creating local configuration that overrides
 * the global Spinal Cord (~/.claude) configuration.
 *
 * Critical Rules from CLAUDE.md:
 * - Child projects MUST NOT override global configuration
 * - No local .mcp.json, hooks, settings.json, or .env
 * - All configuration flows DOWN from ~/.claude/
 *
 * Detects:
 * - Write operations creating .mcp.json in project directories
 * - Write operations creating settings.json outside ~/.claude
 * - Write operations creating hooks/ directory outside ~/.claude
 * - Write operations creating .env outside ~/.claude
 */
import { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function childProjectOverrideDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=child_project_override_detector.d.ts.map