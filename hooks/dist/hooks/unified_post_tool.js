/**
 * Unified Post Tool - Consolidates PostToolUse hooks into 1
 */
import { log } from '../utils.js';
import { registerHook } from '../runner.js';
const API_KEY_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk_live_[a-zA-Z0-9]{20,}/,
    /AKIA[A-Z0-9]{16}/,
    /ghp_[a-zA-Z0-9]{36}/,
];
async function unifiedPostTool(input) {
    const content = String(input.tool_input?.content || '');
    const output = String(input.tool_output || '');
    const combined = content + output;
    for (const pattern of API_KEY_PATTERNS) {
        if (pattern.test(combined)) {
            log('WARNING: Potential API key detected');
            break;
        }
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
registerHook('unified-post-tool', 'PostToolUse', unifiedPostTool);
export default unifiedPostTool;
//# sourceMappingURL=unified_post_tool.js.map