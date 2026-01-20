/**
 * Context Summary Trigger
 * Detects context threshold (4%) and instructs Claude to generate and save a conversation summary
 * before clearing context. This preserves continuity across sessions.
 */
import * as fs from 'fs';
import * as path from 'path';
import { log, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Extract project name from the working directory path
 */
export function extractProjectName(cwd) {
    const basename = path.basename(cwd);
    // Sanitize: remove special characters, replace spaces with hyphens
    return basename.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}
/**
 * Generate the summary filename in format: projectname_summary_YYYY-MM-DD-HH-MM.md
 */
export function generateSummaryFilename(cwd) {
    const projectName = extractProjectName(cwd);
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${projectName}_summary_${date}-${hours}-${minutes}.md`;
}
/**
 * Get the full path to the summary file
 */
export function getSummaryFilePath(cwd) {
    const historyDir = path.join(cwd, 'conversation_history');
    return path.join(historyDir, generateSummaryFilename(cwd));
}
/**
 * Generate the instruction text for Claude to create and save a summary
 */
export function generateSummaryInstructions(cwd, pct) {
    const filename = generateSummaryFilename(cwd);
    const fullPath = getSummaryFilePath(cwd);
    const remaining = 100 - pct;
    return `## CONTEXT LIMIT REACHED - STOP AND SAVE

**Context: ${pct}% used (${remaining}% remaining)**

You MUST stop current work and save a summary NOW. Do not continue with any other tasks.

### Step 1: Create Summary File

Save to: \`${fullPath}\`

\`\`\`markdown
# Session Summary - ${new Date().toISOString().split('T')[0]}

## What We Did
[List the main tasks completed this session]

## Key Decisions
[Any important decisions made and why]

## Files Changed
[List files created/modified with brief purpose]

## Current State
[Where things stand right now]

## Next Steps
[What needs to happen next - be specific]

## Resume Command
\`\`\`
Resume from @${filename}
\`\`\`
\`\`\`

### Step 2: Tell User

After saving, output this message:

---

**CONTEXT LIMIT - Session saved.**

Summary file: \`${fullPath}\`

**To resume:**
1. Run \`/clear\` to reset context
2. Start new message with: \`Resume from @${filename}\`

Copy this now before clearing.

---

### Step 3: STOP

Do not continue working. Wait for user to clear and resume.`;
}
/**
 * Main hook function
 */
async function contextSummaryTrigger(_input) {
    const alertFile = path.join(getClaudeDir(), '.context-alert');
    if (!fs.existsSync(alertFile)) {
        return { hookEventName: 'UserPromptSubmit' };
    }
    try {
        const alertContent = fs.readFileSync(alertFile, 'utf-8');
        const alert = JSON.parse(alertContent);
        // Only process summary-type alerts
        if (alert.type !== 'summary') {
            return { hookEventName: 'UserPromptSubmit' };
        }
        // Only trigger if alert is recent (within last 60 seconds)
        if (Date.now() - (alert.ts || 0) > 60000) {
            return { hookEventName: 'UserPromptSubmit' };
        }
        // Validate we have the required fields
        if (!alert.cwd || !alert.pct) {
            log('CONTEXT ALERT: Missing cwd or pct in alert file');
            return { hookEventName: 'UserPromptSubmit' };
        }
        log(`CONTEXT SUMMARY TRIGGER: ${alert.pct}% - generating summary instructions`);
        const instructions = generateSummaryInstructions(alert.cwd, alert.pct);
        // Output to stderr so user sees it immediately
        console.error('\n' + '='.repeat(60));
        console.error('CONTEXT LIMIT WARNING');
        console.error('='.repeat(60));
        console.error(`Context at ${alert.pct}% - save summary before continuing!`);
        console.error('='.repeat(60) + '\n');
        return {
            hookEventName: 'UserPromptSubmit',
            additionalContext: instructions,
        };
    }
    catch (e) {
        log('CONTEXT SUMMARY TRIGGER: Error reading alert file: ' +
            (e instanceof Error ? e.message : String(e)));
        return { hookEventName: 'UserPromptSubmit' };
    }
}
registerHook('context-summary-trigger', 'UserPromptSubmit', contextSummaryTrigger);
export { contextSummaryTrigger };
export default contextSummaryTrigger;
//# sourceMappingURL=context-summary-trigger.js.map