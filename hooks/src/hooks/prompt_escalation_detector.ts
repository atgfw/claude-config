/**
 * Prompt Escalation Detector Hook (UserPromptSubmit)
 *
 * Detects explicit escalation intent in user prompts.
 * Captures user-reported issues that should be escalated to the global registry.
 */

import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { log } from '../utils.js';
import { registerHook } from '../runner.js';
import { escalate } from '../utils/escalate.js';

// ============================================================================
// Intent Detection Patterns
// ============================================================================

interface EscalationIntent {
  name: string;
  patterns: RegExp[];
  category:
    | 'governance'
    | 'testing'
    | 'tooling'
    | 'pattern'
    | 'performance'
    | 'security'
    | 'documentation'
    | 'meta';
  severity: 'low' | 'medium' | 'high' | 'critical';
  extractSymptom: (userPrompt: string, match: RegExpMatchArray) => string;
  extractContext: (prompt: string) => string;
  proposedSolution: string;
}

const ESCALATION_INTENTS: EscalationIntent[] = [
  {
    name: 'explicit-escalate',
    patterns: [
      /escalate[:\s]+(.+)/i,
      /this should be escalated[:\s]+(.+)/i,
      /report this issue[:\s]+(.+)/i,
      /add to escalation registry[:\s]+(.+)/i,
    ],
    category: 'pattern',
    severity: 'medium',
    extractSymptom: (_userPrompt, match) => match[1]?.trim() || 'User-reported issue',
    extractContext: (_prompt) => `User explicitly requested escalation in prompt`,
    proposedSolution: 'Review and address user-reported issue',
  },
  {
    name: 'this-keeps-happening',
    patterns: [
      /this keeps happening/i,
      /this happens every time/i,
      /this always fails/i,
      /this is a recurring issue/i,
      /this bug keeps coming back/i,
      /same error again/i,
    ],
    category: 'pattern',
    severity: 'medium',
    extractSymptom: (prompt) => {
      // Try to extract the issue from context
      const lines = prompt.split('\n').filter((l) => l.trim());
      return lines[0]?.substring(0, 100) || 'User reports recurring issue';
    },
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Implement hook to prevent recurrence',
  },
  {
    name: 'security-concern',
    patterns: [
      /security (issue|concern|problem|vulnerability)/i,
      /this is (insecure|unsafe)/i,
      /potential (vulnerability|exploit)/i,
      /data leak/i,
      /credential exposure/i,
    ],
    category: 'security',
    severity: 'high',
    extractSymptom: (prompt) => {
      const match = prompt.match(/security (issue|concern|problem|vulnerability)/i);
      return match ? `Security ${match[1]} reported by user` : 'Security concern reported';
    },
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Security audit required',
  },
  {
    name: 'hook-should-prevent',
    patterns: [
      /hook should (prevent|stop|block|catch)/i,
      /why didn't the hook (prevent|stop|block|catch)/i,
      /the hook (didn't work|failed|missed)/i,
      /need a hook (to|for|that)/i,
    ],
    category: 'governance',
    severity: 'medium',
    extractSymptom: (prompt) => {
      const match = prompt.match(/hook should (prevent|stop|block|catch) (.+)/i);
      return match ? `Hook should ${match[1]} ${match[2]}` : 'Hook gap identified';
    },
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Create or enhance hook to address gap',
  },
  {
    name: 'test-framework-issue',
    patterns: [
      /tests (keep failing|always fail|don't work)/i,
      /test framework (issue|problem|broken)/i,
      /can't run tests/i,
      /testing infrastructure/i,
    ],
    category: 'testing',
    severity: 'medium',
    extractSymptom: () => 'Testing infrastructure issue reported',
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Investigate and fix testing infrastructure',
  },
  {
    name: 'documentation-gap',
    patterns: [
      /documentation (is missing|doesn't exist|outdated)/i,
      /where is the documentation/i,
      /this isn't documented/i,
      /docs (are|need) (updating|update)/i,
    ],
    category: 'documentation',
    severity: 'low',
    extractSymptom: () => 'Documentation gap identified',
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Update or create documentation',
  },
  {
    name: 'meta-escalation',
    patterns: [
      /escalation system (issue|problem|bug)/i,
      /the escalation registry/i,
      /escalation hook (issue|problem|failed)/i,
    ],
    category: 'meta',
    severity: 'high',
    extractSymptom: () => 'Issue with escalation system itself',
    extractContext: (prompt) => prompt.substring(0, 300),
    proposedSolution: 'Fix escalation system issue - requires human review',
  },
];

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Prompt Escalation Detector Hook
 *
 * Scans user prompts for escalation intent patterns.
 * When intent is detected, creates escalation entry.
 */
export async function promptEscalationDetectorHook(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  const userPrompt = input.prompt;
  const escalations: string[] = [];

  // Check each intent pattern
  for (const intent of ESCALATION_INTENTS) {
    for (const pattern of intent.patterns) {
      const match = userPrompt.match(pattern);
      if (match) {
        try {
          const symptom = intent.extractSymptom(userPrompt, match);
          const context = intent.extractContext(userPrompt);

          // Escalate (project path is auto-detected)
          escalate({
            symptom,
            context,
            proposedSolution: intent.proposedSolution,
            category: intent.category,
            severity: intent.severity,
          });

          escalations.push(intent.name);
          log(`[ESCALATION] Intent detected: ${intent.name}`);

          // Only match one pattern per intent
          break;
        } catch (error) {
          // Don't fail the hook due to escalation errors
          log(`[ESCALATION-ERROR] ${intent.name}: ${(error as Error).message}`);
        }
      }
    }
  }

  // Build additional context
  let additionalContext = '';
  if (escalations.length > 0) {
    additionalContext = `Detected ${escalations.length} escalation intent(s): ${escalations.join(', ')}`;
  }

  return {
    hookEventName: 'UserPromptSubmit',
    additionalContext,
  };
}

// Register the hook
registerHook('prompt-escalation-detector', 'UserPromptSubmit', promptEscalationDetectorHook);

export default promptEscalationDetectorHook;
