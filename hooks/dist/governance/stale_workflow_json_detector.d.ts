/**
 * Stale Workflow JSON Detector
 *
 * BLOCKS Write/Edit and WARNS on Read for n8n workflow JSON files outside temp/old directories.
 * Local project folders should be documentation/temp workspaces only.
 * The n8n API is the single source of truth for workflow state.
 *
 * Behavior:
 * - Read: WARN (allow with reason) - users may need to read for reference
 * - Write/Edit: BLOCK (deny) - prevent creating/modifying workflow files outside temp/
 *
 * Issue: #19, #33
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function staleWorkflowJsonDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=stale_workflow_json_detector.d.ts.map