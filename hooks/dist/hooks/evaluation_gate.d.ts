/**
 * Evaluation Gate Hook
 *
 * Enforces n8n Evaluation requirements before allowing workflows to exit [DEV] status.
 *
 * Requirements to leave [DEV]:
 * - BLOCKING: Evaluation Trigger node exists
 * - BLOCKING: Error workflow configured
 * - BLOCKING: 98%+ success rate on evaluation runs
 * - ADVISORY: 20+ unique test cases
 * - ADVISORY: Time saved metric set
 * - ADVISORY: MCP access explicitly set
 *
 * Governed tags: [DEV], [ARCHIVE(D)], untagged
 * Not governed: All other tags (ALPHA, BETA, GA, PROD, etc.)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export interface EvaluationGateConfig {
    devTagId: string;
    successRateThreshold: number;
    minTestCases: number;
    enforcement: 'soft' | 'hard';
}
export interface EvaluationGateOptions {
    archiveTagIds?: string[];
    mockExecutions?: {
        executions: Array<{
            status: string;
        }>;
    };
}
interface WorkflowNode {
    type: string;
    name: string;
}
interface WorkflowSettings {
    errorWorkflow?: string;
    timeSaved?: number;
    availableInMCP?: boolean;
}
interface WorkflowTag {
    id: string;
    name: string;
}
export interface Workflow {
    id: string;
    name: string;
    nodes: WorkflowNode[];
    settings: WorkflowSettings;
    tags: WorkflowTag[];
}
export type WorkflowFetcher = (workflowId: string) => Promise<Workflow>;
/**
 * Evaluation Gate Hook
 *
 * Triggers on: mcp__n8n-mcp__n8n_update_partial_workflow
 * When: Operation includes removeTag for [DEV] tag ID
 */
export declare function evaluationGateHook(input: PreToolUseInput, config: EvaluationGateConfig, workflowFetcher: WorkflowFetcher, options?: EvaluationGateOptions): Promise<PreToolUseOutput>;
/**
 * Default configuration
 */
export declare const defaultEvaluationGateConfig: EvaluationGateConfig;
export {};
//# sourceMappingURL=evaluation_gate.d.ts.map