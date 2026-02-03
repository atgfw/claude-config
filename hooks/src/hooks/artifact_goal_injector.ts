/**
 * Artifact Goal Injector - Injects goal context into OpenSpec proposals and plan files
 *
 * Intercepts Write operations to openspec/ and plan .md files to inject
 * a ## Goal section with the current active goal hierarchy.
 *
 * This ensures all artifacts have embedded goal context for traceability.
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { registerHook } from '../runner.js';
import { getActiveGoalContext } from './goal_injector.js';

const OPENSPEC_PATTERN = /[/\\]openspec[/\\]changes[/\\][^/\\]+[/\\](proposal|design|tasks)\.md$/i;
const PLAN_PATTERN = /[/\\]plans?[/\\][^/\\]+\.md$/i;

/**
 * Format goal context as a markdown ## Goal section.
 */
function formatGoalSection(goalContext: {
  summary: string;
  fields: Record<string, string>;
}): string {
  const lines: string[] = ['## Goal', '', goalContext.summary, ''];

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
function hasGoalSection(content: string): boolean {
  return /^## Goal\b/m.test(content);
}

/**
 * Inject goal section into markdown content.
 * Inserts after the first # heading or at the beginning.
 */
function injectGoalSection(content: string, goalSection: string): string {
  // If already has goal section, don't inject
  if (hasGoalSection(content)) {
    return content;
  }

  // Find the first # heading line
  const lines = content.split('\n');
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('# ')) {
      insertIndex = i + 1;
      // Skip any blank lines after the heading
      while (insertIndex < lines.length && lines[insertIndex]?.trim() === '') {
        insertIndex++;
      }
      break;
    }
  }

  // Insert goal section with blank lines for spacing
  lines.splice(insertIndex, 0, '', goalSection, '');

  return lines.join('\n');
}

/**
 * PreToolUse hook - inject goal into OpenSpec and plan file writes
 */
async function artifactGoalInjector(input: PreToolUseInput): Promise<PreToolUseOutput> {
  // Only intercept Write tool
  if (input.tool_name !== 'Write') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const filePath = input.tool_input['file_path'] as string | undefined;
  const content = input.tool_input['content'] as string | undefined;

  if (!filePath || !content) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check if this is an OpenSpec or plan file
  const isOpenSpec = OPENSPEC_PATTERN.test(filePath);
  const isPlan = PLAN_PATTERN.test(filePath);

  if (!isOpenSpec && !isPlan) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Get active goal context
  const goalContext = getActiveGoalContext();
  if (!goalContext) {
    // No goal set - allow write but add context suggesting goal should be set
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          'No active goal set. Consider defining a goal before creating artifacts.',
      },
    };
  }

  // Check if content already has goal section
  if (hasGoalSection(content)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Inject goal section into content
  const goalSection = formatGoalSection(goalContext);
  const modifiedContent = injectGoalSection(content, goalSection);

  // Return modified tool input
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Injected goal context into ${isOpenSpec ? 'OpenSpec' : 'plan'} file`,
    },
    modifiedToolInput: {
      ...input.tool_input,
      content: modifiedContent,
    },
  };
}

registerHook('artifact-goal-injector', 'PreToolUse', artifactGoalInjector);

export {
  artifactGoalInjector,
  formatGoalSection,
  hasGoalSection,
  injectGoalSection,
  OPENSPEC_PATTERN,
  PLAN_PATTERN,
};
