/**
 * Auto-Compact Trigger
 * Reads context alert from statusline and instructs Claude to run /compact at 90%
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { log, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
async function autoCompactTrigger(_input) {
    const alertFile = path.join(getClaudeDir(), '.context-alert');
    if (!fs.existsSync(alertFile)) {
        return { hookEventName: 'UserPromptSubmit' };
    }
    try {
        const alert = JSON.parse(fs.readFileSync(alertFile, 'utf-8'));
        const pct = alert.pct || 0;
        // Only trigger if alert is recent (within last 60 seconds)
        if (Date.now() - (alert.ts || 0) > 60000) {
            return { hookEventName: 'UserPromptSubmit' };
        }
        log('CONTEXT ALERT: ' + pct + '% - triggering compact instruction');
        return {
            hookEventName: 'UserPromptSubmit',
            additionalContext: 'CRITICAL: Context at ' +
                pct +
                '%. Run /compact NOW before responding. After compacting, proceed with user request.',
        };
    }
    catch (e) {
        return { hookEventName: 'UserPromptSubmit' };
    }
}
registerHook('auto-compact-trigger', 'UserPromptSubmit', autoCompactTrigger);
export default autoCompactTrigger;
//# sourceMappingURL=auto-compact-trigger.js.map