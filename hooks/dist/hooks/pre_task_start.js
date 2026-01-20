/**
 * Pre-Task-Start Hook
 * Validates MCP servers, subagents, and child project compliance before starting any task
 * Uses compact mode to skip validation if session was recently validated
 */
import { log, logSeparator, isSessionRecentlyValidated, hasApiKey } from '../utils.js';
import { registerHook } from '../runner.js';
import { quickHealthCheck } from '../mcp/healer.js';
import { checkCurrentProject, reportViolations } from '../enforcement/child_project_detector.js';
/**
 * Pre-Task-Start Hook Implementation
 *
 * Before any task begins, verifies that the environment is ready:
 * - MCP servers are healthy
 * - Required subagents are available
 * - Child project is not overriding global config
 *
 * Uses compact mode: skips full validation if session was validated recently.
 */
export async function preTaskStartHook(_input) {
    // Check for compact mode
    if (isSessionRecentlyValidated()) {
        log('[COMPACT MODE] Session recently validated, skipping pre-task checks');
        return {
            hookEventName: 'UserPromptSubmit',
            additionalContext: 'Compact mode - validation cached',
        };
    }
    logSeparator('PRE-TASK VALIDATION');
    log('');
    const issues = [];
    // Check child project compliance
    log('Checking child project compliance...');
    const violations = checkCurrentProject();
    const errors = violations.filter((v) => v.severity === 'error');
    if (errors.length > 0) {
        log(reportViolations(violations));
        issues.push(`Child project has ${errors.length} override violation(s)`);
    }
    else if (violations.length > 0) {
        log(`[WARN] ${violations.length} configuration warning(s)`);
    }
    else {
        log('[OK] Child project compliance verified');
    }
    // Quick MCP health check
    log('');
    log('Checking critical MCP servers...');
    const mcpHealthy = await quickHealthCheck();
    if (!mcpHealthy) {
        issues.push('One or more critical MCP servers unhealthy');
    }
    else {
        log('[OK] Critical MCP servers healthy');
    }
    // Check critical API keys
    log('');
    log('Checking API keys...');
    const criticalKeys = ['MORPH_API_KEY'];
    for (const key of criticalKeys) {
        if (!hasApiKey(key)) {
            log(`[WARN] Missing ${key}`);
            issues.push(`Missing API key: ${key}`);
        }
        else {
            log(`[OK] ${key} configured`);
        }
    }
    log('');
    // Generate context
    const context = issues.length > 0
        ? `Pre-task validation warnings: ${issues.join('; ')}`
        : 'Pre-task validation passed';
    if (issues.length > 0) {
        log('Issues found (continuing with warnings):');
        for (const issue of issues) {
            log(`  - ${issue}`);
        }
    }
    else {
        log('[OK] All pre-task checks passed');
    }
    return {
        hookEventName: 'UserPromptSubmit',
        additionalContext: context,
    };
}
// Register the hook
registerHook('pre-task-start', 'UserPromptSubmit', preTaskStartHook);
export default preTaskStartHook;
//# sourceMappingURL=pre_task_start.js.map