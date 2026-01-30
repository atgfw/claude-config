/**
 * N8n Webhook Path Validator Tests
 * TDD: Write tests first, then implementation
 *
 * Rules enforced:
 * 1. Webhook trigger paths must be named
 * 2. Must be kebab-case
 * 3. Same or similar name as workflow
 * 4. Long names allowed if perfectly prescriptive
 * 5. Webhook path should NOT be nested (no slashes)
 * 6. Webhook node name itself should always be just 'webhook'
 * 7. Path should never contain the word "test"
 * 8. All webhook triggers must authenticate by a unique secret key
 */

import { describe, it, expect } from 'vitest';
import {
  isKebabCase,
  toKebabCase,
  isNestedPath,
  containsTestWord,
  hasAuthenticationHeader,
  pathMatchesWorkflowName,
  validateWebhookPath,
  validateWebhookNode,
  validateWebhookPayload,
  n8nWebhookPathValidatorHook,
  generateSecretKeyName,
} from '../../src/governance/n8n_webhook_path_validator.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('n8nWebhookPathValidator', () => {
  // =========================================================================
  // Kebab Case Validation
  // =========================================================================
  describe('isKebabCase', () => {
    it('should accept valid kebab-case paths', () => {
      expect(isKebabCase('customer-sync')).toBe(true);
      expect(isKebabCase('servicetitan-job-handler')).toBe(true);
      expect(isKebabCase('fetch-active-jobs')).toBe(true);
      expect(isKebabCase('webhook')).toBe(true);
    });

    it('should reject snake_case paths', () => {
      expect(isKebabCase('customer_sync')).toBe(false);
      expect(isKebabCase('job_handler')).toBe(false);
    });

    it('should reject PascalCase paths', () => {
      expect(isKebabCase('CustomerSync')).toBe(false);
      expect(isKebabCase('JobHandler')).toBe(false);
    });

    it('should reject camelCase paths', () => {
      expect(isKebabCase('customerSync')).toBe(false);
      expect(isKebabCase('jobHandler')).toBe(false);
    });

    it('should reject paths with spaces', () => {
      expect(isKebabCase('customer sync')).toBe(false);
      expect(isKebabCase('job handler')).toBe(false);
    });

    it('should reject paths starting/ending with hyphen', () => {
      expect(isKebabCase('-customer-sync')).toBe(false);
      expect(isKebabCase('customer-sync-')).toBe(false);
    });

    it('should reject consecutive hyphens', () => {
      expect(isKebabCase('customer--sync')).toBe(false);
    });

    it('should reject empty paths', () => {
      expect(isKebabCase('')).toBe(false);
    });
  });

  describe('toKebabCase', () => {
    it('should convert snake_case to kebab-case', () => {
      expect(toKebabCase('customer_sync')).toBe('customer-sync');
      expect(toKebabCase('job_handler_v2')).toBe('job-handler-v2');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('CustomerSync')).toBe('customer-sync');
      expect(toKebabCase('ServiceTitanJobHandler')).toBe('service-titan-job-handler');
    });

    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('customerSync')).toBe('customer-sync');
      expect(toKebabCase('jobHandler')).toBe('job-handler');
    });

    it('should convert spaces to hyphens', () => {
      expect(toKebabCase('customer sync')).toBe('customer-sync');
    });

    it('should collapse multiple hyphens', () => {
      expect(toKebabCase('customer__sync')).toBe('customer-sync');
      expect(toKebabCase('customer--sync')).toBe('customer-sync');
    });
  });

  // =========================================================================
  // Nested Path Detection
  // =========================================================================
  describe('isNestedPath', () => {
    it('should detect nested paths with slashes', () => {
      expect(isNestedPath('api/customer-sync')).toBe(true);
      expect(isNestedPath('/api/customer-sync')).toBe(true);
      expect(isNestedPath('v1/jobs/sync')).toBe(true);
    });

    it('should allow flat paths', () => {
      expect(isNestedPath('customer-sync')).toBe(false);
      expect(isNestedPath('job-handler')).toBe(false);
    });

    it('should handle trailing slashes', () => {
      // Trailing slash creates empty segment which is nested
      expect(isNestedPath('customer-sync/')).toBe(true);
    });
  });

  // =========================================================================
  // Test Word Detection
  // =========================================================================
  describe('containsTestWord', () => {
    it('should detect "test" in path', () => {
      expect(containsTestWord('test-webhook')).toBe(true);
      expect(containsTestWord('webhook-test')).toBe(true);
      expect(containsTestWord('my-test-path')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(containsTestWord('Test-Webhook')).toBe(true);
      expect(containsTestWord('TEST-path')).toBe(true);
    });

    it('should not flag "test" as substring of other words', () => {
      // "contest", "latest", "attest" contain "test" but aren't the word "test"
      expect(containsTestWord('contest-results')).toBe(false);
      expect(containsTestWord('latest-data')).toBe(false);
    });

    it('should allow paths without test', () => {
      expect(containsTestWord('customer-sync')).toBe(false);
      expect(containsTestWord('job-handler')).toBe(false);
    });
  });

  // =========================================================================
  // Authentication Header Detection
  // =========================================================================
  describe('hasAuthenticationHeader', () => {
    it('should detect header auth with secret key', () => {
      expect(
        hasAuthenticationHeader({
          httpMethod: 'POST',
          authentication: 'headerAuth',
          options: {
            headerAuth: {
              name: 'X-Webhook-Secret',
              value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
            },
          },
        })
      ).toBe(true);
    });

    it('should detect header auth in different formats', () => {
      expect(
        hasAuthenticationHeader({
          authentication: 'headerAuth',
          options: {
            headerAuth: {
              name: 'Authorization',
              value: 'Bearer {{$env.WEBHOOK_TOKEN}}',
            },
          },
        })
      ).toBe(true);
    });

    it('should reject missing authentication', () => {
      expect(
        hasAuthenticationHeader({
          httpMethod: 'POST',
        })
      ).toBe(false);
    });

    it('should reject no header auth configured', () => {
      expect(
        hasAuthenticationHeader({
          authentication: 'none',
        })
      ).toBe(false);
    });

    it('should reject empty header auth options', () => {
      expect(
        hasAuthenticationHeader({
          authentication: 'headerAuth',
          options: {},
        })
      ).toBe(false);
    });
  });

  // =========================================================================
  // Path Matches Workflow Name
  // =========================================================================
  describe('pathMatchesWorkflowName', () => {
    it('should match exact kebab-case conversion', () => {
      expect(pathMatchesWorkflowName('customer-sync', 'CustomerSync')).toBe(true);
      expect(pathMatchesWorkflowName('customer-sync', 'customer_sync')).toBe(true);
    });

    it('should match with system prefix stripped', () => {
      expect(pathMatchesWorkflowName('job-sync', 'ServiceTitan_job_sync')).toBe(true);
      expect(pathMatchesWorkflowName('agent-handler', 'ElevenLabs_agent_handler')).toBe(true);
    });

    it('should allow longer descriptive paths', () => {
      // Path can be longer if it's more descriptive
      expect(pathMatchesWorkflowName('fetch-active-customer-jobs', 'customer_jobs')).toBe(true);
    });

    it('should reject completely unrelated paths', () => {
      expect(pathMatchesWorkflowName('billing-sync', 'CustomerSync')).toBe(false);
      expect(pathMatchesWorkflowName('random-path', 'job_handler')).toBe(false);
    });
  });

  // =========================================================================
  // Webhook Path Validation
  // =========================================================================
  describe('validateWebhookPath', () => {
    it('should pass valid kebab-case path', () => {
      const result = validateWebhookPath('customer-sync', 'customer_sync');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for empty path', () => {
      const result = validateWebhookPath('', 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be named'))).toBe(true);
    });

    it('should fail for non-kebab-case path', () => {
      const result = validateWebhookPath('customer_sync', 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('kebab-case'))).toBe(true);
    });

    it('should fail for nested path', () => {
      const result = validateWebhookPath('api/customer-sync', 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('nested'))).toBe(true);
    });

    it('should fail for path containing test', () => {
      const result = validateWebhookPath('test-customer-sync', 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('test'))).toBe(true);
    });

    it('should warn for path not matching workflow name', () => {
      const result = validateWebhookPath('random-path', 'customer_sync');
      expect(result.valid).toBe(true); // Warning only
      expect(result.warnings.some((w) => w.includes('match'))).toBe(true);
    });
  });

  // =========================================================================
  // Webhook Node Validation
  // =========================================================================
  describe('validateWebhookNode', () => {
    const validWebhookNode = {
      name: 'webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'customer-sync',
        httpMethod: 'POST',
        authentication: 'headerAuth',
        options: {
          headerAuth: {
            name: 'X-Webhook-Secret',
            value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
          },
        },
      },
    };

    it('should pass valid webhook node', () => {
      const result = validateWebhookNode(validWebhookNode, 'customer_sync');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for wrong node name', () => {
      const node = {
        ...validWebhookNode,
        name: 'api_webhook',
      };
      const result = validateWebhookNode(node, 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('should fail for missing authentication', () => {
      const node = {
        ...validWebhookNode,
        parameters: {
          path: 'customer-sync',
          httpMethod: 'POST',
        },
      };
      const result = validateWebhookNode(node, 'customer_sync');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('authenticate'))).toBe(true);
    });

    it('should skip validation for non-webhook nodes', () => {
      const httpNode = {
        name: 'http_request',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {},
      };
      const result = validateWebhookNode(httpNode, 'workflow');
      expect(result.valid).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  // =========================================================================
  // Full Payload Validation
  // =========================================================================
  describe('validateWebhookPayload', () => {
    it('should validate all webhook nodes in workflow', () => {
      const payload = {
        name: 'customer_sync',
        nodes: [
          {
            name: 'webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: 'customer-sync',
              authentication: 'headerAuth',
              options: {
                headerAuth: {
                  name: 'X-Webhook-Secret',
                  value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
                },
              },
            },
          },
          {
            name: 'process_data',
            type: 'n8n-nodes-base.code',
            parameters: {},
          },
        ],
      };
      const result = validateWebhookPayload(payload);
      expect(result.valid).toBe(true);
    });

    it('should aggregate errors from multiple webhook nodes', () => {
      const payload = {
        name: 'customer_sync',
        nodes: [
          {
            name: 'api_webhook', // Wrong name
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: 'api/test-sync', // Nested and contains test
            },
          },
        ],
      };
      const result = validateWebhookPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should pass workflow with no webhook nodes', () => {
      const payload = {
        name: 'batch_processor',
        nodes: [
          {
            name: 'schedule_trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            parameters: {},
          },
        ],
      };
      const result = validateWebhookPayload(payload);
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Secret Key Name Generation
  // =========================================================================
  describe('generateSecretKeyName', () => {
    it('should generate proper env var name from webhook path', () => {
      expect(generateSecretKeyName('customer-sync')).toBe('N8N_IN_SECRET_CUSTOMER_SYNC');
      expect(generateSecretKeyName('job-handler')).toBe('N8N_IN_SECRET_JOB_HANDLER');
    });

    it('should handle already uppercase paths', () => {
      expect(generateSecretKeyName('CUSTOMER-SYNC')).toBe('N8N_IN_SECRET_CUSTOMER_SYNC');
    });
  });

  // =========================================================================
  // Hook Integration
  // =========================================================================
  describe('n8nWebhookPathValidatorHook', () => {
    it('should allow valid webhook workflow creation', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'customer_sync',
          nodes: [
            {
              name: 'webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                path: 'customer-sync',
                authentication: 'headerAuth',
                options: {
                  headerAuth: {
                    name: 'X-Webhook-Secret',
                    value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
                  },
                },
              },
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block webhook with nested path', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'customer_sync',
          nodes: [
            {
              name: 'webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                path: 'api/customer-sync',
                authentication: 'headerAuth',
                options: {
                  headerAuth: {
                    name: 'X-Webhook-Secret',
                    value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
                  },
                },
              },
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('nested');
    });

    it('should block webhook with test in path', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          name: 'customer_sync',
          nodes: [
            {
              name: 'webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                path: 'test-customer-sync',
                authentication: 'headerAuth',
                options: {
                  headerAuth: {
                    name: 'X-Webhook-Secret',
                    value: '={{$env.N8N_IN_SECRET_TEST_CUSTOMER_SYNC}}',
                  },
                },
              },
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('test');
    });

    it('should block webhook without authentication', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'customer_sync',
          nodes: [
            {
              name: 'webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                path: 'customer-sync',
              },
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('authenticate');
    });

    it('should block webhook with wrong node name', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'customer_sync',
          nodes: [
            {
              name: 'api_trigger',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                path: 'customer-sync',
                authentication: 'headerAuth',
                options: {
                  headerAuth: {
                    name: 'X-Webhook-Secret',
                    value: '={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}',
                  },
                },
              },
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('webhook');
    });

    it('should allow workflow without webhook nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'batch_processor',
          nodes: [
            {
              name: 'schedule_trigger',
              type: 'n8n-nodes-base.scheduleTrigger',
              parameters: {},
            },
          ],
        },
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when no workflow data present', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const result = await n8nWebhookPathValidatorHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
