/**
 * Evidence Requirement Gate Hook
 *
 * Enforces that task completions and issue closures include verbatim evidence
 * from the codebase proving the work was done.
 *
 * GitHub Issue: #30
 * Trigger: PreToolUse on TaskUpdate (status=completed), Bash (gh issue close)
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { registerHook } from '../runner.js';

// Evidence format patterns
const EVIDENCE_PATTERNS = {
  // file_path:line_number format
  fileRef: /[a-zA-Z0-9_\-./\\]+\.(ts|js|json|md|py|tsx|jsx):\d+/,
  // Verbatim code quotes (backticks or code blocks)
  verbatim: /`[^`]+`|```[\s\S]+?```/,
  // Verification method (grep, read, test, cat)
  verification: /\b(grep|read|test|cat|bun test|vitest|npm test)\b/i,
};

/**
 * Check if text contains evidence of completion.
 */
function hasEvidence(text: string): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!EVIDENCE_PATTERNS.fileRef.test(text)) {
    missing.push('file reference (file_path:line_number)');
  }

  if (!EVIDENCE_PATTERNS.verbatim.test(text)) {
    missing.push('verbatim code quote (backticks)');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if a TaskUpdate is marking a task as completed.
 */
function isCompletionUpdate(toolInput: Record<string, unknown>): boolean {
  const status = toolInput.status as string | undefined;
  return status === 'completed';
}

/**
 * Check if a Bash command is closing a GitHub issue.
 */
function isIssueCloseCommand(command: string): boolean {
  return /gh\s+issue\s+close/.test(command);
}

/**
 * Extract evidence-relevant text from TaskUpdate input.
 */
function extractTaskUpdateText(toolInput: Record<string, unknown>): string {
  const parts: string[] = [];

  // Check description field
  if (typeof toolInput.description === 'string') {
    parts.push(toolInput.description);
  }

  // Check metadata field
  if (toolInput.metadata && typeof toolInput.metadata === 'object') {
    const meta = toolInput.metadata as Record<string, unknown>;
    if (typeof meta.evidence === 'string') {
      parts.push(meta.evidence);
    }
    if (typeof meta.verbatim === 'string') {
      parts.push(meta.verbatim);
    }
    if (typeof meta.fileRef === 'string') {
      parts.push(meta.fileRef);
    }
  }

  return parts.join('\n');
}

/**
 * Extract evidence from gh issue close command.
 */
function extractIssueCloseText(command: string): string {
  // Look for --comment flag content
  const commentMatch = command.match(/--comment\s+["']([^"']+)["']/);
  if (commentMatch?.[1]) {
    return commentMatch[1];
  }

  // Look for HEREDOC content
  const heredocMatch = command.match(/--comment\s+"\$\(cat <<['"]?EOF['"]?\n([\s\S]+?)\nEOF\s*\)"/);
  if (heredocMatch?.[1]) {
    return heredocMatch[1];
  }

  return command;
}

/**
 * PreToolUse hook - validate evidence for completions.
 */
async function evidenceRequirementGate(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const { tool_name, tool_input } = input;

  // Check TaskUpdate completions
  if (tool_name === 'TaskUpdate' && isCompletionUpdate(tool_input)) {
    const text = extractTaskUpdateText(tool_input);
    const evidence = hasEvidence(text);

    if (!evidence.valid) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: `[!] WARN: Task completion missing evidence. Consider adding:\n- ${evidence.missing.join('\n- ')}\nNext time include file references and verbatim quotes.`,
        },
      };
    }
  }

  // Check gh issue close commands
  if (tool_name === 'Bash') {
    const command = tool_input.command as string | undefined;
    if (command && isIssueCloseCommand(command)) {
      const text = extractIssueCloseText(command);
      const evidence = hasEvidence(text);

      if (!evidence.valid) {
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: `[!] WARN: Issue closure missing evidence. Consider adding file references and verbatim quotes next time.`,
          },
        };
      }
    }
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

registerHook('evidence-requirement-gate', 'PreToolUse', evidenceRequirementGate);

export {
  evidenceRequirementGate,
  hasEvidence,
  isCompletionUpdate,
  isIssueCloseCommand,
  EVIDENCE_PATTERNS,
};
export default evidenceRequirementGate;
