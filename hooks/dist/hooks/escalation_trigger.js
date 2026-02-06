/**
 * Escalation Trigger Hook (PostToolUse)
 *
 * Monitors tool use results for patterns that indicate systematic issues.
 * Auto-escalates when warnings, repeated errors, or governance violations occur.
 */
import { log } from '../utils.js';
import { registerHook } from '../runner.js';
import { escalateFromHook } from '../utils/escalate.js';
import { createFromEscalation } from '../github/issue_crud.js';
const ESCALATION_PATTERNS = [
    {
        name: 'morph-fallback-detected',
        test: (input) => {
            // Detect when Morph was supposed to be used but Edit/Write was used instead
            const toolName = input.tool_name;
            if (toolName !== 'Edit' && toolName !== 'Write')
                return false;
            // Check if tool output suggests Morph should have been used
            const output = String(input.tool_output ?? '');
            return output.includes('Morph') || output.includes('filesystem-with-morph');
        },
        symptom: () => 'Edit/Write used when Morph MCP should have been preferred',
        context: (input) => `Tool: ${input.tool_name}, File: ${JSON.stringify(input.tool_input).substring(0, 100)}`,
        proposedSolution: 'Ensure Morph MCP is healthy and pre-write hook enforces Morph preference',
        category: 'tooling',
        severity: 'medium',
    },
    {
        name: 'repeated-bash-error',
        test: (input) => {
            if (input.tool_name !== 'Bash')
                return false;
            const result = String(input.tool_output ?? '');
            // Check for common error patterns
            return (result.includes('command not found') ||
                result.includes('No such file or directory') ||
                result.includes('Permission denied') ||
                result.includes('ENOENT') ||
                result.includes('error:') ||
                result.includes('Error:'));
        },
        symptom: (input) => {
            const result = String(input.tool_output ?? '');
            if (result.includes('command not found'))
                return 'Bash command not found error';
            if (result.includes('No such file or directory'))
                return 'File or directory not found in Bash';
            if (result.includes('Permission denied'))
                return 'Permission denied in Bash execution';
            return 'Bash command execution error';
        },
        context: (input) => {
            const cmd = input.tool_input?.command ?? 'unknown';
            return `Command: ${cmd.substring(0, 100)}`;
        },
        proposedSolution: 'Add hook to validate command prerequisites before execution',
        category: 'tooling',
        severity: 'low',
    },
    {
        name: 'security-sensitive-operation',
        test: (input) => {
            const toolName = input.tool_name;
            const inputStr = JSON.stringify(input.tool_input ?? {}).toLowerCase();
            // Detect security-sensitive patterns
            return (inputStr.includes('password') ||
                inputStr.includes('secret') ||
                inputStr.includes('api_key') ||
                inputStr.includes('apikey') ||
                inputStr.includes('token') ||
                inputStr.includes('credential') ||
                (toolName === 'Write' && inputStr.includes('.env')) ||
                (toolName === 'Edit' && inputStr.includes('.env')));
        },
        symptom: () => 'Security-sensitive operation detected without explicit governance',
        context: (input) => `Tool: ${input.tool_name}, Contains sensitive patterns`,
        proposedSolution: 'Implement security-auditor review requirement for sensitive operations',
        category: 'security',
        severity: 'high',
    },
    {
        name: 'test-failure-pattern',
        test: (input) => {
            if (input.tool_name !== 'Bash')
                return false;
            const cmd = input.tool_input?.command ?? '';
            const result = String(input.tool_output ?? '');
            // Check if this was a test command that failed
            const isTestCommand = cmd.includes('npm test') ||
                cmd.includes('vitest') ||
                cmd.includes('jest') ||
                cmd.includes('pytest');
            const hasFailed = result.includes('FAIL') ||
                result.includes('failed') ||
                result.includes('Error:') ||
                result.includes('AssertionError');
            return isTestCommand && hasFailed;
        },
        symptom: () => 'Test execution failure detected',
        context: (input) => {
            const result = String(input.tool_output ?? '');
            // Extract first few lines of failure
            const lines = result.split('\n').filter((l) => l.includes('FAIL') || l.includes('Error'));
            return lines.slice(0, 3).join('; ');
        },
        proposedSolution: 'Track test failure patterns for automated debugging assistance',
        category: 'testing',
        severity: 'medium',
    },
    {
        name: 'workflow-api-error',
        test: (input) => {
            const toolName = input.tool_name;
            const result = String(input.tool_output ?? '');
            // Detect n8n or external API errors
            const isApiTool = toolName.includes('n8n') ||
                toolName.includes('elevenlabs') ||
                toolName.includes('supabase');
            return (isApiTool &&
                (result.includes('error') || result.includes('Error') || result.includes('failed')));
        },
        symptom: (input) => `API error in ${input.tool_name}`,
        context: (input) => {
            const result = String(input.tool_output ?? '').substring(0, 200);
            return result;
        },
        proposedSolution: 'Implement API health monitoring and retry patterns',
        category: 'tooling',
        severity: 'medium',
    },
];
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Escalation Trigger Hook
 *
 * Monitors PostToolUse events for patterns that indicate systematic issues.
 * When patterns are detected, escalates to the registry for tracking.
 */
export async function escalationTriggerHook(input) {
    const escalations = [];
    // Check each pattern
    for (const pattern of ESCALATION_PATTERNS) {
        try {
            if (pattern.test(input)) {
                // Escalate (project path is auto-detected by escalate utility)
                const result = escalateFromHook('escalation-trigger', {
                    symptom: pattern.symptom(input),
                    context: pattern.context(input),
                    proposedSolution: pattern.proposedSolution,
                    category: pattern.category,
                    severity: pattern.severity,
                });
                // Log escalation (isNovel means new, otherwise it was deduplicated or incremented)
                escalations.push(pattern.name);
                log(`[ESCALATION] Pattern detected: ${pattern.name}${result.isNovel ? ' (new)' : ' (existing)'}`);
                if (result.patternDetected) {
                    log(`[ESCALATION] Pattern threshold met for: ${pattern.name}`);
                    // Auto-create GitHub issue for high/critical escalations
                    try {
                        createFromEscalation({
                            description: pattern.symptom(input),
                            category: pattern.category,
                            severity: pattern.severity,
                        });
                    }
                    catch (issueErr) {
                        log(`[ESCALATION] Issue creation failed: ${issueErr.message}`);
                    }
                }
            }
        }
        catch (error) {
            // Don't fail the hook due to escalation errors
            log(`[ESCALATION-ERROR] ${pattern.name}: ${error.message}`);
        }
    }
    // Build additional context
    let additionalContext = '';
    if (escalations.length > 0) {
        additionalContext = `Escalated ${escalations.length} pattern(s): ${escalations.join(', ')}`;
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext,
        },
    };
}
// Register the hook
registerHook('escalation-trigger', 'PostToolUse', escalationTriggerHook);
export default escalationTriggerHook;
//# sourceMappingURL=escalation_trigger.js.map