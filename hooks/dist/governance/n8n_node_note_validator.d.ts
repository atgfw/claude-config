/**
 * n8n Node Note Validator Hook
 *
 * ENFORCES documentation requirements for n8n nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see CLAUDE.md "n8n Node Documentation"):
 * - All nodes MUST have substantial notes (minimum 20 characters)
 * - Notes MUST describe purpose, not just repeat node name
 * - "Display Note in Flow?" MUST be enabled (notesInFlow: true)
 * - No placeholder text (TODO, FIXME, etc.)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
interface N8nNode {
    name: string;
    type: string;
    notes?: string;
    notesInFlow?: boolean;
    parameters?: Record<string, unknown>;
}
interface N8nWorkflowPayload {
    name?: string;
    nodes?: N8nNode[];
}
interface NoteValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Check if a note is a placeholder
 */
export declare function isPlaceholderNote(note: string): boolean;
/**
 * Check if note duplicates the node name
 */
export declare function isDuplicateOfName(note: string, nodeName: string): boolean;
/**
 * Check if note contains at least one verb (action word)
 * This ensures the note describes what the node does
 */
export declare function containsActionVerb(note: string): boolean;
/**
 * Validate a single node's documentation
 */
export declare function validateNodeNote(node: N8nNode): NoteValidationResult;
/**
 * Validate all nodes in a workflow payload
 */
export declare function validateWorkflowNotes(payload: N8nWorkflowPayload): NoteValidationResult;
/**
 * Main n8n node note validator hook
 */
export declare function n8nNodeNoteValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nNodeNoteValidatorHook;
//# sourceMappingURL=n8n_node_note_validator.d.ts.map