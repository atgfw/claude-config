import { describe, it, expect } from 'vitest';
import {
  isPlaceholderNote,
  isDuplicateOfName,
  containsActionVerb,
  validateNodeNote,
  validateWorkflowNotes,
  n8nNodeNoteValidatorHook,
} from '../../src/governance/n8n_node_note_validator.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('n8nNodeNoteValidator', () => {
  // =========================================================================
  // Placeholder Detection
  // =========================================================================
  describe('isPlaceholderNote', () => {
    it('should detect TODO placeholders', () => {
      expect(isPlaceholderNote('TODO: add description')).toBe(true);
      expect(isPlaceholderNote('todo add note here')).toBe(true);
    });

    it('should detect FIXME placeholders', () => {
      expect(isPlaceholderNote('FIXME: describe this')).toBe(true);
    });

    it('should detect generic placeholders', () => {
      expect(isPlaceholderNote('add description')).toBe(true);
      expect(isPlaceholderNote('description here')).toBe(true);
      expect(isPlaceholderNote('note here')).toBe(true);
      expect(isPlaceholderNote('TBD')).toBe(true);
      expect(isPlaceholderNote('...')).toBe(true);
    });

    it('should not flag legitimate notes', () => {
      expect(isPlaceholderNote('Fetches customer data from ServiceTitan API')).toBe(false);
      expect(isPlaceholderNote('Transforms the input data for the next step')).toBe(false);
    });
  });

  // =========================================================================
  // Name Duplicate Detection
  // =========================================================================
  describe('isDuplicateOfName', () => {
    it('should detect exact duplicates', () => {
      expect(isDuplicateOfName('HTTP Request', 'HTTP Request')).toBe(true);
      expect(isDuplicateOfName('http request', 'HTTP Request')).toBe(true);
    });

    it('should detect near-duplicates', () => {
      expect(isDuplicateOfName('HTTP Request node', 'HTTP Request')).toBe(true);
      expect(isDuplicateOfName('The HTTP Request', 'HTTP Request')).toBe(true);
    });

    it('should not flag substantially different notes', () => {
      expect(
        isDuplicateOfName(
          'Posts job completion status to ServiceTitan webhook endpoint',
          'HTTP Request'
        )
      ).toBe(false);
      expect(isDuplicateOfName('Fetches all active customers from the API', 'HTTP Request')).toBe(
        false
      );
    });
  });

  // =========================================================================
  // Action Verb Detection
  // =========================================================================
  describe('containsActionVerb', () => {
    it('should detect common action verbs', () => {
      expect(containsActionVerb('Fetches customer data from API')).toBe(true);
      expect(containsActionVerb('Sends notification to Slack')).toBe(true);
      expect(containsActionVerb('Transforms JSON payload')).toBe(true);
      expect(containsActionVerb('Validates input data')).toBe(true);
    });

    it('should detect verb variations', () => {
      expect(containsActionVerb('Processing the request')).toBe(true);
      expect(containsActionVerb('Processed customer records')).toBe(true);
      expect(containsActionVerb('Updates the database')).toBe(true);
    });

    it('should not find verbs in noun-only text', () => {
      expect(containsActionVerb('Customer data endpoint')).toBe(false);
      expect(containsActionVerb('API configuration settings')).toBe(false);
    });
  });

  // =========================================================================
  // Single Node Validation
  // =========================================================================
  describe('validateNodeNote', () => {
    it('should pass valid nodes with good notes', () => {
      const result = validateNodeNote({
        name: 'fetch_customers',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'Fetches all active customers from the ServiceTitan API',
        notesInFlow: true,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block nodes without notes', () => {
      const result = validateNodeNote({
        name: 'http_request',
        type: 'n8n-nodes-base.httpRequest',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must have a note'))).toBe(true);
    });

    it('should block notes that are too short', () => {
      const result = validateNodeNote({
        name: 'http_request',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'Gets data',
        notesInFlow: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too short'))).toBe(true);
    });

    it('should block placeholder notes', () => {
      const result = validateNodeNote({
        name: 'http_request',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'TODO: add description here',
        notesInFlow: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Placeholder'))).toBe(true);
    });

    it('should block notes that duplicate the node name', () => {
      const result = validateNodeNote({
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'HTTP Request',
        notesInFlow: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not just repeat'))).toBe(true);
    });

    it('should block when notesInFlow is false', () => {
      const result = validateNodeNote({
        name: 'fetch_customers',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'Fetches all active customers from ServiceTitan API',
        notesInFlow: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Display Note in Flow'))).toBe(true);
    });

    it('should warn when no action verb (but not block)', () => {
      const result = validateNodeNote({
        name: 'data_endpoint',
        type: 'n8n-nodes-base.httpRequest',
        notes: 'Customer data API endpoint configuration for ServiceTitan',
        notesInFlow: true,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Full Workflow Validation
  // =========================================================================
  describe('validateWorkflowNotes', () => {
    it('should validate all nodes in workflow', () => {
      const result = validateWorkflowNotes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'fetch_data',
            type: 'n8n-nodes-base.httpRequest',
            notes: 'Fetches customer data from ServiceTitan API',
            notesInFlow: true,
          },
          {
            name: 'transform_data',
            type: 'n8n-nodes-base.code',
            notes: 'Transforms the customer records into the required format',
            notesInFlow: true,
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should aggregate errors from multiple nodes', () => {
      const result = validateWorkflowNotes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'node_one',
            type: 'n8n-nodes-base.httpRequest',
            // Missing note
          },
          {
            name: 'node_two',
            type: 'n8n-nodes-base.code',
            notes: 'TODO',
            notesInFlow: true,
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip manual trigger nodes', () => {
      const result = validateWorkflowNotes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'manual_trigger',
            type: 'n8n-nodes-base.manualTrigger',
            // No note required for manual trigger
          },
          {
            name: 'process_data',
            type: 'n8n-nodes-base.code',
            notes: 'Processes the incoming data and prepares it for the API',
            notesInFlow: true,
          },
        ],
      });
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Hook Integration
  // =========================================================================
  describe('n8nNodeNoteValidatorHook', () => {
    it('should allow workflow with properly documented nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'fetch_jobs',
              type: 'n8n-nodes-base.httpRequest',
              notes: 'Fetches active jobs from ServiceTitan for the current dispatch zone',
              notesInFlow: true,
            },
          ],
        },
      };

      const result = await n8nNodeNoteValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block workflow with undocumented nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'http_request',
              type: 'n8n-nodes-base.httpRequest',
              // No notes
            },
          ],
        },
      };

      const result = await n8nNodeNoteValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('must have a note');
    });

    it('should block nodes with shallow notes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'http_request',
              type: 'n8n-nodes-base.httpRequest',
              notes: 'Gets data',
              notesInFlow: true,
            },
          ],
        },
      };

      const result = await n8nNodeNoteValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('too short');
    });
  });
});
