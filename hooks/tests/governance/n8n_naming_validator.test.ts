import { describe, it, expect } from 'vitest';
import {
  containsBracketTag,
  containsVersionNumber,
  isSnakeCase,
  toSnakeCase,
  containsArbitraryInteger,
  suggestSystemPrefix,
  validateWorkflowName,
  validateNodeName,
  validateWorkflowPayload,
  n8nNamingValidatorHook,
} from '../../src/governance/n8n_naming_validator.js';
import { PreToolUseInput } from '../../src/types.js';

describe('n8nNamingValidator', () => {
  // =========================================================================
  // Bracket Tag Detection
  // =========================================================================
  describe('containsBracketTag', () => {
    it('should detect bracket tags', () => {
      expect(containsBracketTag('[ST] Customer Sync')).toEqual({ found: true, tag: '[ST]' });
      expect(containsBracketTag('[DEV] Test Workflow')).toEqual({ found: true, tag: '[DEV]' });
      expect(containsBracketTag('[EL]_agent_sync')).toEqual({ found: true, tag: '[EL]' });
    });

    it('should not detect when no bracket tag', () => {
      expect(containsBracketTag('ServiceTitan_customer_sync')).toEqual({ found: false, tag: null });
      expect(containsBracketTag('my_workflow')).toEqual({ found: false, tag: null });
    });

    it('should not match lowercase bracket content', () => {
      expect(containsBracketTag('[test] workflow')).toEqual({ found: false, tag: null });
    });
  });

  // =========================================================================
  // Version Number Detection
  // =========================================================================
  describe('containsVersionNumber', () => {
    it('should detect v1, v2 patterns', () => {
      expect(containsVersionNumber('workflow_v2')).toEqual({ found: true, pattern: 'v2' });
      expect(containsVersionNumber('ServiceTitan_sync_v1')).toEqual({ found: true, pattern: 'v1' });
      expect(containsVersionNumber('V3_workflow')).toEqual({ found: true, pattern: 'V3' });
    });

    it('should detect r1, r2 patterns', () => {
      expect(containsVersionNumber('workflow_r2')).toEqual({ found: true, pattern: 'r2' });
      expect(containsVersionNumber('sync_R3')).toEqual({ found: true, pattern: 'R3' });
    });

    it('should detect trailing _1, _2', () => {
      expect(containsVersionNumber('workflow_1')).toEqual({ found: true, pattern: '1' });
      expect(containsVersionNumber('sync_workflow_2')).toEqual({ found: true, pattern: '2' });
    });

    it('should not match canonical patterns', () => {
      // Note: containsVersionNumber only checks for version patterns, not canonicals
      // The integer check handles canonicals separately
      expect(containsVersionNumber('oauth2_handler')).toEqual({ found: false, pattern: null });
      expect(containsVersionNumber('base64_encoder')).toEqual({ found: false, pattern: null });
    });

    it('should not match when no version', () => {
      expect(containsVersionNumber('customer_sync')).toEqual({ found: false, pattern: null });
      expect(containsVersionNumber('ServiceTitan_workflow')).toEqual({
        found: false,
        pattern: null,
      });
    });
  });

  // =========================================================================
  // Snake Case Validation
  // =========================================================================
  describe('isSnakeCase', () => {
    it('should accept valid snake_case', () => {
      expect(isSnakeCase('get_customer_data')).toBe(true);
      expect(isSnakeCase('fetch_jobs')).toBe(true);
      expect(isSnakeCase('http_request')).toBe(true);
      expect(isSnakeCase('sync_data_to_servicetitan')).toBe(true);
    });

    it('should reject PascalCase', () => {
      expect(isSnakeCase('GetCustomerData')).toBe(false);
      expect(isSnakeCase('FetchJobs')).toBe(false);
    });

    it('should reject camelCase', () => {
      expect(isSnakeCase('getCustomerData')).toBe(false);
      expect(isSnakeCase('fetchJobs')).toBe(false);
    });

    it('should reject names with spaces', () => {
      expect(isSnakeCase('get customer data')).toBe(false);
      expect(isSnakeCase('HTTP Request')).toBe(false);
    });

    it('should reject names starting/ending with underscore', () => {
      expect(isSnakeCase('_private_name')).toBe(false);
      expect(isSnakeCase('name_')).toBe(false);
    });

    it('should reject consecutive underscores', () => {
      expect(isSnakeCase('get__data')).toBe(false);
    });
  });

  describe('toSnakeCase', () => {
    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('GetCustomerData')).toBe('get_customer_data');
      expect(toSnakeCase('HTTPRequest')).toBe('h_t_t_p_request');
    });

    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('getCustomerData')).toBe('get_customer_data');
    });

    it('should convert spaces to underscores', () => {
      expect(toSnakeCase('Get Customer Data')).toBe('get_customer_data');
    });

    it('should handle hyphens', () => {
      expect(toSnakeCase('get-customer-data')).toBe('get_customer_data');
    });
  });

  // =========================================================================
  // Arbitrary Integer Detection
  // =========================================================================
  describe('containsArbitraryInteger', () => {
    it('should detect arbitrary integers', () => {
      expect(containsArbitraryInteger('process_data_2')).toEqual({ found: true, integer: '2' });
      expect(containsArbitraryInteger('handler123')).toEqual({ found: true, integer: '123' });
    });

    it('should allow canonical integers', () => {
      expect(containsArbitraryInteger('base64_encoder')).toEqual({ found: false, integer: null });
      expect(containsArbitraryInteger('oauth2_handler')).toEqual({ found: false, integer: null });
      expect(containsArbitraryInteger('sha256_hash')).toEqual({ found: false, integer: null });
      expect(containsArbitraryInteger('utf8_decoder')).toEqual({ found: false, integer: null });
      expect(containsArbitraryInteger('http2_client')).toEqual({ found: false, integer: null });
    });

    it('should detect integers even with canonical present if additional', () => {
      expect(containsArbitraryInteger('base64_encoder_2')).toEqual({ found: true, integer: '2' });
    });

    it('should not detect when no integers', () => {
      expect(containsArbitraryInteger('customer_sync')).toEqual({ found: false, integer: null });
      expect(containsArbitraryInteger('fetch_data')).toEqual({ found: false, integer: null });
    });
  });

  // =========================================================================
  // System Prefix Suggestions
  // =========================================================================
  describe('suggestSystemPrefix', () => {
    it('should suggest ServiceTitan_ for [ST]', () => {
      expect(suggestSystemPrefix('[ST]')).toBe('ServiceTitan_');
      expect(suggestSystemPrefix('ST')).toBe('ServiceTitan_');
    });

    it('should suggest ElevenLabs_ for [EL]', () => {
      expect(suggestSystemPrefix('[EL]')).toBe('ElevenLabs_');
    });

    it('should return null for unknown abbreviations', () => {
      expect(suggestSystemPrefix('[XYZ]')).toBe(null);
      expect(suggestSystemPrefix('UNKNOWN')).toBe(null);
    });
  });

  // =========================================================================
  // Workflow Name Validation
  // =========================================================================
  describe('validateWorkflowName', () => {
    it('should pass valid workflow names', () => {
      const result = validateWorkflowName('ServiceTitan_customer_sync');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow [DEV] tag (only allowed bracket tag)', () => {
      const result = validateWorkflowName('[DEV] ServiceTitan_sync');
      expect(result.valid).toBe(true);
    });

    it('should block other bracket tags', () => {
      const result = validateWorkflowName('[ST] Customer Sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('[ST]'))).toBe(true);
      expect(result.suggestions.some((s) => s.includes('ServiceTitan_'))).toBe(true);
    });

    it('should block version numbers', () => {
      const result = validateWorkflowName('ServiceTitan_sync_v2');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('v2'))).toBe(true);
    });

    it('should block trailing integers as version numbers', () => {
      const result = validateWorkflowName('ServiceTitan_sync_batch_5');
      expect(result.valid).toBe(false); // _5 is a version pattern
      expect(result.errors.some((e) => e.includes('5'))).toBe(true);
    });

    it('should reject empty names', () => {
      const result = validateWorkflowName('');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    });
  });

  // =========================================================================
  // Node Name Validation
  // =========================================================================
  describe('validateNodeName', () => {
    it('should pass valid snake_case node names', () => {
      const result = validateNodeName('fetch_customer_data');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block PascalCase node names', () => {
      const result = validateNodeName('GetCustomerData');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('snake_case'))).toBe(true);
      expect(result.suggestions.some((s) => s.includes('get_customer_data'))).toBe(true);
    });

    it('should block version numbers in node names', () => {
      const result = validateNodeName('http_request_v2');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('v2'))).toBe(true);
    });

    it('should block arbitrary integers', () => {
      const result = validateNodeName('process_data_2');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Integer'))).toBe(true);
    });

    it('should allow canonical integers', () => {
      const result = validateNodeName('base64_encode');
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Full Workflow Payload Validation
  // =========================================================================
  describe('validateWorkflowPayload', () => {
    it('should validate workflow name and all nodes', () => {
      const result = validateWorkflowPayload({
        name: 'ServiceTitan_customer_sync',
        nodes: [
          { name: 'fetch_customers', type: 'n8n-nodes-base.httpRequest' },
          { name: 'transform_data', type: 'n8n-nodes-base.code' },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should aggregate errors from workflow name and nodes', () => {
      const result = validateWorkflowPayload({
        name: '[ST] Customer Sync v2',
        nodes: [{ name: 'GetCustomerData', type: 'n8n-nodes-base.httpRequest' }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // workflow + node errors
    });
  });

  // =========================================================================
  // Hook Integration
  // =========================================================================
  describe('n8nNamingValidatorHook', () => {
    it('should allow valid workflow creation', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'ServiceTitan_job_sync',
          nodes: [{ name: 'fetch_jobs', type: 'n8n-nodes-base.httpRequest' }],
        },
      };

      const result = await n8nNamingValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block workflow with bracket tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: '[ST] Job Sync',
          nodes: [],
        },
      };

      const result = await n8nNamingValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('[ST]');
    });

    it('should block workflow with version number', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          name: 'ServiceTitan_sync_v2',
          nodes: [],
        },
      };

      const result = await n8nNamingValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('v2');
    });

    it('should block node with non-snake_case name', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'valid_workflow_name',
          nodes: [{ name: 'HTTPRequest', type: 'n8n-nodes-base.httpRequest' }],
        },
      };

      const result = await n8nNamingValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('snake_case');
    });
  });
});
