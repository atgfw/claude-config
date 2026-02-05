/**
 * Rewst Jinja Validator Hook
 *
 * Validates Jinja expressions in files for Rewst-specific anti-patterns.
 * Only activates when CLAUDE_PROJECT_DIR matches Rewst project patterns.
 */

// #region imports
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { registerHook } from '../runner.js';
import { log } from '../utils.js';
// #endregion imports

// #region constants
const REWST_PROJECT_PATTERNS = [/rewst/i, /workflow.*development/i];

const ANTI_PATTERNS: Array<[RegExp, string]> = [
  [/\bnull\b/, 'Use None instead of null (Python keyword)'],
  [/\bNull\b/, 'Use None instead of Null (Python keyword)'],
  [/\|\s*match\b/, 'match is not a valid Jinja test in Rewst'],
  [/\|\s*regex_search\b/, 'regex_search is not valid in Rewst'],
  [/\bnamespace\b/, 'namespace is not a valid Jinja keyword in Rewst'],
  [/\|\s*union\b/, 'Use combine filter instead of union'],
  [/\|\s*to_utc_iso\b/, 'Use convert_from_epoch or parse_datetime instead'],
  [/\|\s*iso\b/, 'iso filter not available - use parse_datetime'],
  [
    /from_yaml_string\s*\|\s*d\(\[\]\)/,
    'd([]) after from_yaml_string does not work on NULL - check existence first',
  ],
  [/{#.*#}/, 'Comments break Jinja evaluation in Rewst - remove them'],
];
// #endregion constants

// #region helpers
function isRewstProject(projectDir: string): boolean {
  return REWST_PROJECT_PATTERNS.some((pattern) => pattern.test(projectDir));
}

function containsJinja(text: string): boolean {
  return text.includes('{{') || text.includes('{%');
}

function findAntiPatterns(text: string): string[] {
  const warnings: string[] = [];

  for (const [pattern, message] of ANTI_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push(`[!] Rewst Jinja: ${message}`);
    }
  }

  return warnings;
}

function extractContent(input: PreToolUseInput): string {
  const toolInput = input.tool_input as Record<string, unknown> | undefined;

  if (!toolInput) {
    return '';
  }

  const content = (toolInput.content as string) ?? '';
  const newString = (toolInput.new_string as string) ?? '';

  return content || newString;
}
// #endregion helpers

// #region main
export async function rewstJinjaValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? '';

  if (!isRewstProject(projectDir)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const textToCheck = extractContent(input);

  if (!textToCheck || !containsJinja(textToCheck)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const warnings = findAntiPatterns(textToCheck);

  if (warnings.length === 0) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  for (const warning of warnings) {
    log(warning);
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: warnings.join('\n'),
    },
  };
}

registerHook('rewst-jinja-validator', 'PreToolUse', rewstJinjaValidatorHook);
// #endregion main
