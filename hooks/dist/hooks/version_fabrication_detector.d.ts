/**
 * Version Fabrication Detector Hook
 *
 * GLOBAL rule: Never fabricate versioning systems or version numbers anywhere.
 *
 * Detects when Write/Edit/Bash operations introduce version-like patterns
 * that didn't exist before in the file or codebase context.
 *
 * Rules (see hooks/docs/n8n-governance.md "Version Numbers Banned"):
 * - If a project has no versioning, don't add one
 * - Don't append _v2, _new, _backup to files/functions/classes
 * - Version numbers only valid when:
 *   1. The project already uses semantic versioning
 *   2. The user explicitly requests versioning
 *   3. It's a canonical term (oauth2, base64, sha256)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
interface VersionDetectionResult {
    found: boolean;
    patterns: string[];
    locations: string[];
}
/**
 * Check if a string contains fabricated version patterns.
 */
export declare function detectFabricatedVersions(text: string): VersionDetectionResult;
/**
 * Check a filename directly for version patterns.
 * This handles cases where the filename itself has versioning (e.g., handler_v2.ts)
 */
export declare function detectFilenameVersioning(filename: string): VersionDetectionResult;
/**
 * Main version fabrication detector hook.
 * Blocks Write/Edit operations that introduce fabricated versioning.
 */
export declare function versionFabricationDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default versionFabricationDetectorHook;
//# sourceMappingURL=version_fabrication_detector.d.ts.map