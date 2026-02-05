/**
 * Rewst Request Router Hook
 *
 * Routes incoming requests to appropriate subagents based on content analysis.
 * Only activates when CLAUDE_PROJECT_DIR matches Rewst project patterns.
 */

// #region imports
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { registerHook } from '../runner.js';
// #endregion imports

// #region constants
const REWST_PROJECT_PATTERNS = [/rewst/i, /workflow.*development/i];

const ROUTING_RULES: Array<{ pattern: RegExp; agent: string; context: string }> = [
  {
    pattern: /jinja|expression|template|ctx\.|org\./i,
    agent: 'rewst-jinja-orchestrator',
    context:
      'Rewst Jinja expression work detected. Consider using rewst-jinja-orchestrator subagent.',
  },
  {
    pattern: /graphql|query|mutation|schema|api\s*(call|request|endpoint)/i,
    agent: 'graphql-architect',
    context: 'GraphQL/API work detected. Use graphql-architect subagent for schema exploration.',
  },
  {
    pattern: /debug|error|fix|broken|not working|fails/i,
    agent: 'debugger',
    context:
      'Debugging request detected. Consider using debugger subagent for root cause analysis.',
  },
  {
    pattern: /review|check|quality|audit/i,
    agent: 'code-reviewer',
    context: 'Code review request detected. Consider using code-reviewer subagent.',
  },
  {
    pattern: /workflow|automation|task|transition/i,
    agent: 'rewst-jinja-orchestrator',
    context: 'Rewst workflow work detected. Reference rewst-jinja skill for patterns.',
  },
  {
    pattern: /test|validate|verify/i,
    agent: 'test-automator',
    context: 'Testing request detected. Consider using test-automator subagent.',
  },
  {
    pattern: /security|credential|secret|api.?key/i,
    agent: 'security-auditor',
    context: 'Security-sensitive request detected. Consider using security-auditor subagent.',
  },
];
// #endregion constants

// #region helpers
function isRewstProject(projectDir: string): boolean {
  return REWST_PROJECT_PATTERNS.some((pattern) => pattern.test(projectDir));
}

function detectRoutes(prompt: string): string[] {
  const detected: string[] = [];

  for (const rule of ROUTING_RULES) {
    if (rule.pattern.test(prompt)) {
      detected.push(`- ${rule.context}`);
    }
  }

  return detected;
}
// #endregion helpers

// #region main
export async function rewstRequestRouterHook(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? '';

  if (!isRewstProject(projectDir)) {
    return {
      hookEventName: 'UserPromptSubmit',
    };
  }

  const prompt = input.prompt ?? '';
  const routes = detectRoutes(prompt);

  if (routes.length === 0) {
    return {
      hookEventName: 'UserPromptSubmit',
    };
  }

  return {
    hookEventName: 'UserPromptSubmit',
    additionalContext: `**Rewst Request Types Detected:**\n${routes.join('\n')}`,
  };
}

registerHook('rewst-request-router', 'UserPromptSubmit', rewstRequestRouterHook);
// #endregion main
