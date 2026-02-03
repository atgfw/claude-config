/**
 * Artifact Goal Injector - Validates goal context in OpenSpec proposals and plan files
 *
 * Uses PostToolUse to check Write operations to openspec/ and plan .md files.
 * If goal section is missing, adds additionalContext instructing inclusion.
 *
 * This ensures all artifacts have embedded goal context for traceability.
 */
import { registerHook } from '../runner.js';
import { getActiveGoalContext } from './goal_injector.js';
const OPENSPEC_PATTERN = /[/\\]openspec[/\\]changes[/\\][^/\\]+[/\\](proposal|design|tasks)\.md$/i;
const PLAN_PATTERN = /[/\\]plans?[/\\][^/\\]+\.md$/i;
/**
 * Format goal context as a markdown ## Goal section.
 */
function formatGoalSection(goalContext) {
    const lines = ['## Goal', '', goalContext.summary, ''];
    const fieldOrder = ['who', 'what', 'when', 'where', 'why', 'how'];
    for (const field of fieldOrder) {
        const value = goalContext.fields[field];
        if (value && value !== 'unknown') {
            lines.push(`- **${field.toUpperCase()}:** ${value}`);
        }
    }
    return lines.join('\n');
}
/**
 * Check if content already has a ## Goal section.
 */
function hasGoalSection(content) {
    return /^## Goal\b/m.test(content);
}
/**
 * PostToolUse hook - check goal presence in OpenSpec and plan files after write
 */
async function artifactGoalInjector(input) {
    // Only check Write tool
    if (input.tool_name !== 'Write') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    const filePath = input.tool_input['file_path'];
    const content = input.tool_input['content'];
    if (!filePath || !content) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Check if this is an OpenSpec or plan file
    const isOpenSpec = OPENSPEC_PATTERN.test(filePath);
    const isPlan = PLAN_PATTERN.test(filePath);
    if (!isOpenSpec && !isPlan) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Check if content has goal section
    if (hasGoalSection(content)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Get active goal context
    const goalContext = getActiveGoalContext();
    if (!goalContext) {
        // No goal set - suggest defining one
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: `WARNING: ${isOpenSpec ? 'OpenSpec' : 'Plan'} file written without ## Goal section and no active goal is set. Define a goal before creating artifacts to ensure traceability.`,
            },
        };
    }
    // Goal exists but file doesn't have section - provide context with suggested section
    const goalSection = formatGoalSection(goalContext);
    const fileType = isOpenSpec ? 'OpenSpec' : 'plan';
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `NOTE: ${fileType} file written without ## Goal section. Add the following section after the title:\n\n${goalSection}\n\nEdit the file to include this goal context for traceability.`,
        },
    };
}
registerHook('artifact-goal-injector', 'PostToolUse', artifactGoalInjector);
export { artifactGoalInjector, formatGoalSection, hasGoalSection, OPENSPEC_PATTERN, PLAN_PATTERN };
//# sourceMappingURL=artifact_goal_injector.js.map