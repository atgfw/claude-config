/**
 * Pre-Task-Complete Hook
 * BLOCKS task completion until:
 * 1. Visual validation is performed (when frontend code was written)
 * 2. Warns about unverified success criteria in PROJECT-DIRECTIVE.md
 *
 * Enforces:
 * - "Task completion requires visual validation using MCP tools"
 * - "All success criteria must be verified before project completion"
 */

import type { StopInput, StopOutput } from '../types.js';
import { log, logBlocked, logAllowed, flagExists, archiveFlag, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
import { updateCriteriaStatus, formatCriteriaStatus } from '../ledger/success_criteria_tracker.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

const VALIDATION_FLAG = 'validation-completed';
const VISUAL_VALIDATION_NEEDED_FLAG = 'visual-validation-needed';

/**
 * Find project root from current working directory
 */
function findProjectRoot(): string | null {
  const cwd = process.cwd();
  const indicators = ['package.json', '.git', 'PROJECT-DIRECTIVE.md', 'CLAUDE.md'];

  let current = cwd;
  const root = path.parse(current).root;

  while (current !== root) {
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(current, indicator))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Pre-Task-Complete Hook Implementation
 *
 * Before allowing task completion:
 * 1. Checks if visual validation is needed (frontend code was written)
 * 2. Checks success criteria verification status from PROJECT-DIRECTIVE.md
 */
export async function preTaskCompleteHook(_input: StopInput): Promise<StopOutput> {
  log('Pre-Task-Complete Validation');
  log('============================');
  log('');

  let blocked = false;
  let blockReason = '';

  // 1. Check visual validation requirement
  log('1. Visual Validation Check');
  log('--------------------------');

  if (!flagExists(VISUAL_VALIDATION_NEEDED_FLAG)) {
    logAllowed('No frontend code detected - visual validation not required');
  } else if (!flagExists(VALIDATION_FLAG)) {
    blocked = true;
    blockReason = 'Visual validation not performed';

    logBlocked(
      'Cannot mark task complete - frontend code was written',
      'Task completion requires visual validation using MCP tools.'
    );
    log('');
    log('REQUIRED ACTIONS:');
    log('  1. Use Scrapling MCP (preferred) or Playwright to navigate to output');
    log('  2. Take screenshot with browser_take_screenshot');
    log('  3. Verify visually that output matches expectations');
    log('  4. Create validation flag:');
    log(`     touch ${getClaudeDir()}/validation-completed`);
    log('');
  } else {
    logAllowed('Visual validation confirmed');
    // Archive the flags for next task
    archiveFlag(VALIDATION_FLAG);
    archiveFlag(VISUAL_VALIDATION_NEEDED_FLAG);
  }

  // 2. Check success criteria from PROJECT-DIRECTIVE.md
  log('');
  log('2. Success Criteria Check');
  log('-------------------------');

  const projectRoot = findProjectRoot();

  if (projectRoot) {
    try {
      const status = updateCriteriaStatus(projectRoot);

      if (status.totalCount > 0) {
        log(formatCriteriaStatus(status));
        log('');

        if (status.percentComplete < 100) {
          log(`WARNING: ${status.totalCount - status.verifiedCount} success criteria unverified`);
          log('');
          log('To mark criteria as verified:');
          log('  1. Run tests that verify each criterion');
          log('  2. Document evidence in test certificates');
          log('  3. Mark checkbox in PROJECT-DIRECTIVE.md: - [x]');
          log('');

          // Note: Not blocking on unverified criteria by default
          // Projects can opt-in to strict enforcement via flag
          if (flagExists('strict-success-criteria')) {
            blocked = true;
            blockReason = blockReason
              ? `${blockReason}; ${status.totalCount - status.verifiedCount} success criteria unverified`
              : `${status.totalCount - status.verifiedCount} success criteria unverified`;
          }
        } else {
          logAllowed('All success criteria verified');
        }
      } else {
        log('No success criteria defined in PROJECT-DIRECTIVE.md');
      }
    } catch (e) {
      log('Could not check success criteria (ledger error)');
    }
  } else {
    log('Could not determine project root');
  }

  log('');

  if (blocked) {
    return {
      decision: 'block',
      reason: blockReason,
    };
  }

  logAllowed('Task completion allowed');
  return {
    decision: 'approve',
  };
}

// Register the hook
registerHook('pre-task-complete', 'Stop', preTaskCompleteHook);

export default preTaskCompleteHook;
