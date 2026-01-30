/**
 * Stale Workflow JSON Detector
 *
 * WARNS when n8n workflow JSON files are accessed outside temp/old directories.
 * Local project folders should be documentation/temp workspaces only.
 * The n8n API is the single source of truth for workflow state.
 *
 * Issue: #19
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function staleWorkflowJsonDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=stale_workflow_json_detector.d.ts.map