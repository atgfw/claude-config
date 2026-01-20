/**
 * Ghost File Detector
 *
 * PREVENTS treating local files as source of truth when cloud APIs are authoritative.
 *
 * Critical Rule from CLAUDE.md:
 * - LIVE APIs are source of truth
 * - Local files (governance.yaml, registry.yaml) are documentation/cache only
 * - Always query LIVE APIs before creating cloud objects
 *
 * Ghost Files: Local files that claim to represent cloud state but are stale/wrong
 *
 * Detects:
 * - Reads of governance.yaml, registry.yaml, manifests when creating cloud objects
 * - Suggests using LIVE API queries instead
 */
import { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function ghostFileDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=ghost_file_detector.d.ts.map