import { describe, it, expect } from 'vitest';
import {
  lintCodeNodeContent,
  isComplexInlineExpression,
  extractCodeFromNode,
  validateWorkflowCodeNodes,
  codeNodeLintingGateHook,
} from '../../src/governance/code_node_linting_gate.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('codeNodeLintingGate', () => {
  // =========================================================================
  // Basic Linting Rules
  // =========================================================================
  describe('lintCodeNodeContent', () => {
    it('should pass clean code', () => {
      const code = `
const items = $input.all();
const filtered = items.filter(item => item.json.active);
return filtered;
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch var keyword usage', () => {
      const code = `
var x = 1;
return [{ json: { value: x } }];
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('no-var'))).toBe(true);
    });

    it('should catch debugger statements', () => {
      const code = `
const items = $input.all();
debugger;
return items;
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('no-debugger'))).toBe(true);
    });

    it('should catch eval usage', () => {
      const code = `
const result = eval('1 + 1');
return [{ json: { result } }];
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('no-eval'))).toBe(true);
    });

    it('should warn on console.log', () => {
      const code = `
const items = $input.all();
console.log('Processing items:', items.length);
return items;
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.includes('no-console'))).toBe(true);
    });

    it('should warn on empty catch blocks', () => {
      const code = `
try {
  const data = JSON.parse(input);
} catch (e) {}
return [];
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.includes('no-empty-catch'))).toBe(true);
    });

    it('should pass empty code', () => {
      const result = lintCodeNodeContent('');
      expect(result.valid).toBe(true);
    });

    it('should allow n8n-specific globals', () => {
      const code = `
const items = $input.all();
const json = $json;
const workflow = $workflow.name;
return items;
`;
      const result = lintCodeNodeContent(code);
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Complex Expression Detection
  // =========================================================================
  describe('isComplexInlineExpression', () => {
    it('should detect complex chained methods', () => {
      expect(
        isComplexInlineExpression('{{ $json.data.filter(x => x.active).map(x => x.id).join(",") }}')
      ).toBe(true);
    });

    it('should detect complex array operations', () => {
      expect(
        isComplexInlineExpression(
          '{{ $json.items.filter(i => i.status === "active").reduce((a, b) => a + b.value, 0) }}'
        )
      ).toBe(true);
    });

    it('should allow simple field access', () => {
      expect(isComplexInlineExpression('{{ $json.customer.name }}')).toBe(false);
      expect(isComplexInlineExpression('{{ $json.id }}')).toBe(false);
    });

    it('should allow simple method calls', () => {
      expect(isComplexInlineExpression('{{ $json.name.toLowerCase() }}')).toBe(false);
    });

    it('should not flag non-expression strings', () => {
      expect(isComplexInlineExpression('Just a regular string')).toBe(false);
      expect(isComplexInlineExpression('')).toBe(false);
    });
  });

  // =========================================================================
  // Code Extraction
  // =========================================================================
  describe('extractCodeFromNode', () => {
    it('should extract code from jsCode parameter', () => {
      const node = {
        name: 'code_node',
        type: 'n8n-nodes-base.code',
        parameters: {
          jsCode: 'return $input.all();',
        },
      };
      expect(extractCodeFromNode(node)).toBe('return $input.all();');
    });

    it('should extract code from code parameter', () => {
      const node = {
        name: 'code_node',
        type: 'n8n-nodes-base.code',
        parameters: {
          code: 'return items;',
        },
      };
      expect(extractCodeFromNode(node)).toBe('return items;');
    });

    it('should return null for non-code nodes', () => {
      const node = {
        name: 'http_request',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {},
      };
      expect(extractCodeFromNode(node)).toBeNull();
    });
  });

  // =========================================================================
  // Full Workflow Validation
  // =========================================================================
  describe('validateWorkflowCodeNodes', () => {
    it('should validate all code nodes', () => {
      const result = validateWorkflowCodeNodes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'process_data',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const items = $input.all();\nreturn items.filter(i => i.json.active);',
            },
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should catch linting errors in code nodes', () => {
      const result = validateWorkflowCodeNodes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'bad_code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'var x = 1; debugger; return x;',
            },
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should warn on complex inline expressions in other nodes', () => {
      const result = validateWorkflowCodeNodes({
        name: 'test_workflow',
        nodes: [
          {
            name: 'set_node',
            type: 'n8n-nodes-base.set',
            parameters: {
              value: '{{ $json.data.filter(x => x.active).map(x => x.id).join(",") }}',
            },
          },
        ],
      });
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.includes('Complex expression'))).toBe(true);
    });
  });

  // =========================================================================
  // Hook Integration
  // =========================================================================
  describe('codeNodeLintingGateHook', () => {
    it('should allow workflow with clean code nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'transform_data',
              type: 'n8n-nodes-base.code',
              parameters: {
                jsCode: 'const items = $input.all();\nreturn items;',
              },
            },
          ],
        },
      };

      const result = await codeNodeLintingGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block workflow with linting errors', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'bad_code',
              type: 'n8n-nodes-base.code',
              parameters: {
                jsCode: 'var x = 1;\neval("alert(1)");\nreturn x;',
              },
            },
          ],
        },
      };

      const result = await codeNodeLintingGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow with warnings for console.log', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          name: 'test_workflow',
          nodes: [
            {
              name: 'debug_code',
              type: 'n8n-nodes-base.code',
              parameters: {
                jsCode: 'const items = $input.all();\nconsole.log(items);\nreturn items;',
              },
            },
          ],
        },
      };

      const result = await codeNodeLintingGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('WARNING');
    });
  });
});
