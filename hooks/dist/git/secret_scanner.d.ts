/**
 * Secret Scanner Hook
 * BLOCKS git commits/pushes that contain secrets or API keys
 * Enforcement: STRICT - Hard block on detection
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Secret Scanner Hook Implementation
 */
export declare function secretScannerHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default secretScannerHook;
//# sourceMappingURL=secret_scanner.d.ts.map