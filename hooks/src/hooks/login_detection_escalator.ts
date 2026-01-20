/**
 * Login Detection Escalator Hook (PostToolUse)
 *
 * Monitors browser automation results for login page patterns.
 * When a login page is detected, escalates to the user with clear instructions.
 *
 * Escalation chain:
 * 1. Browser navigation/screenshot occurs
 * 2. This hook analyzes the output for login indicators
 * 3. If login detected -> Return context instructing agent to ask user to authenticate
 * 4. Agent receives context, prompts user for manual login
 */

import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import { log, logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';

// ============================================================================
// Login Detection Patterns
// ============================================================================

/**
 * Patterns that indicate a login page
 */
const LOGIN_PAGE_PATTERNS = [
  // Form indicators
  /type\s*=\s*["']?password["']?/i,
  /name\s*=\s*["']?password["']?/i,
  /id\s*=\s*["']?password["']?/i,
  /autocomplete\s*=\s*["']?current-password["']?/i,
  /autocomplete\s*=\s*["']?new-password["']?/i,

  // Text indicators
  /\bsign\s*in\b/i,
  /\blog\s*in\b/i,
  /\blogin\b/i,
  /\bsign\s*on\b/i,
  /\bauthenticate\b/i,
  /\benter\s*your\s*password\b/i,
  /\bforgot\s*password\b/i,
  /\breset\s*password\b/i,

  // OAuth indicators
  /\bsign\s*in\s*with\s*google\b/i,
  /\bsign\s*in\s*with\s*microsoft\b/i,
  /\bcontinue\s*with\s*sso\b/i,
  /\bsingle\s*sign[- ]?on\b/i,
  /oauth/i,
  /authorize/i,

  // Session indicators
  /\bsession\s*expired\b/i,
  /\bsession\s*timeout\b/i,
  /\bplease\s*log\s*in\s*again\b/i,
  /\byour\s*session\s*has\s*ended\b/i,

  // Access denied indicators
  /\baccess\s*denied\b/i,
  /\bunauthorized\b/i,
  /\b401\b/,
  /\b403\b/,
];

/**
 * URL patterns that indicate login/auth pages
 */
const LOGIN_URL_PATTERNS = [
  /\/login/i,
  /\/signin/i,
  /\/sign-in/i,
  /\/auth/i,
  /\/authenticate/i,
  /\/oauth/i,
  /\/sso/i,
  /\/session/i,
  /accounts\.google\.com/i,
  /login\.microsoftonline\.com/i,
  /auth0\.com/i,
  /okta\.com/i,
];

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Login Detection Escalator Hook
 *
 * Analyzes browser automation output for login page indicators
 * and escalates to user when authentication is required.
 */
export async function loginDetectionEscalatorHook(
  input: PostToolUseInput
): Promise<PostToolUseOutput> {
  const toolName = input.tool_name;

  // Only process browser automation tools
  if (!isBrowserTool(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  log(`[login-detection-escalator] Analyzing browser output from: ${toolName}`);

  // Extract content to analyze
  const contentToAnalyze = extractAnalyzableContent(input);

  if (!contentToAnalyze) {
    log('[login-detection-escalator] No content to analyze');
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  // Check for login indicators
  const loginIndicators = detectLoginIndicators(contentToAnalyze);
  const urlLoginIndicators = detectUrlLoginIndicators(input);

  const totalIndicators = loginIndicators.length + urlLoginIndicators.length;

  if (totalIndicators === 0) {
    log('[login-detection-escalator] No login indicators detected');
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  // Login detected - escalate to user
  log('[login-detection-escalator] LOGIN PAGE DETECTED');
  log(`  Content indicators: ${loginIndicators.length}`);
  log(`  URL indicators: ${urlLoginIndicators.length}`);

  // Extract URL if available
  const url = extractUrl(input);

  logBlocked(
    'Login/authentication page detected',
    'Escalate login prompts to the user. Do not attempt to bypass authentication.'
  );
  log('');
  log('DETECTED INDICATORS:');
  for (const indicator of [...loginIndicators, ...urlLoginIndicators].slice(0, 5)) {
    log(`  - ${indicator}`);
  }
  log('');

  // Build escalation message
  const escalationMessage = buildEscalationMessage(url, loginIndicators, urlLoginIndicators);

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: escalationMessage,
    },
  };
}

/**
 * Check if a tool is a browser automation tool
 */
function isBrowserTool(toolName: string): boolean {
  const browserPrefixes = ['mcp__scrapling__', 'mcp__playwright__'];
  return browserPrefixes.some((prefix) => toolName.toLowerCase().startsWith(prefix));
}

/**
 * Extract analyzable content from tool output
 */
function extractAnalyzableContent(input: PostToolUseInput): string | null {
  const output = input.tool_output;

  if (!output) {
    return null;
  }

  // Handle string output
  if (typeof output === 'string') {
    return output;
  }

  // Handle object output - look for common content fields
  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;

    // Try common content fields
    const contentFields = ['content', 'html', 'text', 'body', 'data', 'result', 'page_content'];
    for (const field of contentFields) {
      if (typeof obj[field] === 'string') {
        return obj[field] as string;
      }
    }

    // Stringify the whole object as fallback
    return JSON.stringify(output);
  }

  return null;
}

/**
 * Extract URL from tool input or output
 */
function extractUrl(input: PostToolUseInput): string | null {
  // Check input for URL
  const toolInput = input.tool_input;
  if (toolInput && typeof toolInput === 'object') {
    const inputObj = toolInput as Record<string, unknown>;
    if (typeof inputObj['url'] === 'string') {
      return inputObj['url'];
    }
  }

  // Check output for URL
  const output = input.tool_output;
  if (output && typeof output === 'object') {
    const outputObj = output as Record<string, unknown>;
    if (typeof outputObj['url'] === 'string') {
      return outputObj['url'];
    }
  }

  return null;
}

/**
 * Detect login indicators in content
 */
function detectLoginIndicators(content: string): string[] {
  const indicators: string[] = [];

  for (const pattern of LOGIN_PAGE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      indicators.push(`Content: "${match[0].substring(0, 50)}"`);
    }
  }

  return indicators;
}

/**
 * Detect login indicators in URL
 */
function detectUrlLoginIndicators(input: PostToolUseInput): string[] {
  const url = extractUrl(input);
  if (!url) {
    return [];
  }

  const indicators: string[] = [];

  for (const pattern of LOGIN_URL_PATTERNS) {
    if (pattern.test(url)) {
      indicators.push(`URL: ${url.substring(0, 100)}`);
      break; // One URL indicator is enough
    }
  }

  return indicators;
}

/**
 * Build the escalation message for the agent
 */
function buildEscalationMessage(
  url: string | null,
  _contentIndicators: string[],
  _urlIndicators: string[]
): string {
  const parts: string[] = [];

  parts.push('AUTH_ESCALATION_REQUIRED: Login/authentication page detected.');
  parts.push('');
  parts.push('MANDATORY ESCALATION PROTOCOL:');
  parts.push('');
  parts.push('1. STOP all browser automation immediately - do not attempt to fill login forms');
  parts.push('2. USE THE AskUserQuestion TOOL to prompt the human user to authenticate manually');
  parts.push('3. WAIT for explicit user confirmation that login is complete');
  parts.push('4. Browser session will be persisted - user only needs to log in once');
  parts.push('');

  if (url) {
    parts.push(`TARGET URL: ${url}`);
    parts.push('');
  }

  parts.push('REQUIRED USER PROMPT (use AskUserQuestion tool):');
  parts.push('');
  parts.push('Question: "Authentication required - please log in manually"');
  parts.push('Options:');
  parts.push('  1. "I have logged in" - User completed authentication');
  parts.push('  2. "Skip this site" - User wants to skip this target');
  parts.push('  3. "Cancel task" - User wants to abort the current operation');
  parts.push('');
  parts.push('SESSION PERSISTENCE: The browser session is configured with persistent storage.');
  parts.push('After logging in once, the session will be preserved for future automation runs.');
  parts.push('');
  parts.push('DO NOT attempt to:');
  parts.push('- Fill in username/password fields programmatically');
  parts.push('- Click login buttons without user confirmation');
  parts.push('- Bypass or circumvent authentication');
  parts.push('- Continue automation until user confirms login complete');

  return parts.join('\n');
}

// Register the hook
registerHook('login-detection-escalator', 'PostToolUse', loginDetectionEscalatorHook);

export default loginDetectionEscalatorHook;
