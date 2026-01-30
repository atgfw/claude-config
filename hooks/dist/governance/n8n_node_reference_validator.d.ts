/**
 * n8n Node Reference Validator Hook
 *
 * Scans code node jsCode for $('...') patterns and validates that
 * referenced node names exist in the workflow nodes array.
 * Prevents silent runtime failures from stale node references.
 *
 * Triggers on: n8n_create_workflow, n8n_update_partial_workflow, n8n_update_full_workflow
 */
interface N8nNode {
    name: string;
    type: string;
    parameters?: {
        jsCode?: string;
        [key: string]: unknown;
    };
}
/** Extract $('NodeName') references from code */
declare function extractNodeReferences(code: string): string[];
/** Validate all code node references against known node names */
declare function validateReferences(nodes: N8nNode[]): {
    valid: boolean;
    errors: string[];
};
export { extractNodeReferences, validateReferences };
//# sourceMappingURL=n8n_node_reference_validator.d.ts.map