/**
 * Bun Enforcer Hook
 *
 * PreToolUse hook that blocks npm, node, and npx commands,
 * requiring bun equivalents instead.
 *
 * Mappings:
 * - npm install → bun install
 * - npm run → bun run
 * - npm test → bun test
 * - npx → bunx
 * - node script.js → bun script.js
 * - node -e → bun -e
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export interface DetectionResult {
    blocked: boolean;
    matches: Array<{
        found: string;
        replacement: string;
    }>;
}
export declare function detectBlockedCommands(command: string): DetectionResult;
declare function bunEnforcerHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export { bunEnforcerHook };
export default bunEnforcerHook;
//# sourceMappingURL=bun_enforcer.d.ts.map