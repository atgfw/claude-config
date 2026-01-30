import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { PreToolUseInput } from '../../src/types.js';

// We'll import after writing the implementation
import {
  isCloudCreationTool,
  extractEntityName,
  findProjectDirective,
  checkTestRunRegistry,
  cloudObjectCreationGateHook,
} from '../../src/governance/cloud_object_creation_gate.js';

function createInput(toolName: string, toolInput: Record<string, unknown>): PreToolUseInput {
  return { tool_name: toolName, tool_input: toolInput };
}

describe('cloudObjectCreationGate', () => {
  // =========================================================================
  // Tool Matching
  // =========================================================================
  describe('isCloudCreationTool', () => {
    it('should match n8n create workflow', () => {
      expect(isCloudCreationTool('mcp__n8n-mcp__n8n_create_workflow')).toBe(true);
    });

    it('should match n8n update workflow', () => {
      expect(isCloudCreationTool('mcp__n8n-mcp__n8n_update_workflow')).toBe(true);
    });

    it('should match elevenlabs tools', () => {
      expect(isCloudCreationTool('mcp__elevenlabs__create_agent')).toBe(true);
      expect(isCloudCreationTool('mcp__elevenlabs__update_agent')).toBe(true);
    });

    it('should match servicetitan tools', () => {
      expect(isCloudCreationTool('mcp__servicetitan__create_job')).toBe(true);
    });

    it('should not match local tools', () => {
      expect(isCloudCreationTool('Write')).toBe(false);
      expect(isCloudCreationTool('Edit')).toBe(false);
      expect(isCloudCreationTool('Bash')).toBe(false);
      expect(isCloudCreationTool('Read')).toBe(false);
    });

    it('should not match n8n read-only tools', () => {
      expect(isCloudCreationTool('mcp__n8n-mcp__n8n_get_workflow')).toBe(false);
      expect(isCloudCreationTool('mcp__n8n-mcp__n8n_list_workflows')).toBe(false);
    });
  });

  // =========================================================================
  // Entity Name Extraction
  // =========================================================================
  describe('extractEntityName', () => {
    it('should extract from tool_input.name', () => {
      expect(extractEntityName({ name: 'customer_sync' })).toBe('customer_sync');
    });

    it('should extract from nested workflow.name', () => {
      expect(extractEntityName({ workflow: { name: 'customer_sync' } })).toBe('customer_sync');
    });

    it('should extract from agent_name', () => {
      expect(extractEntityName({ agent_name: 'support_agent' })).toBe('support_agent');
    });

    it('should return null when no name found', () => {
      expect(extractEntityName({ id: '123' })).toBeNull();
    });
  });

  // =========================================================================
  // PROJECT-DIRECTIVE.md Walk-up
  // =========================================================================
  describe('findProjectDirective', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-gate-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should find PROJECT-DIRECTIVE.md in current directory', () => {
      fs.writeFileSync(path.join(tmpDir, 'PROJECT-DIRECTIVE.md'), '# Directive');
      expect(findProjectDirective(tmpDir)).not.toBeNull();
    });

    it('should find PROJECT-DIRECTIVE.md in parent directory', () => {
      const childDir = path.join(tmpDir, 'child');
      fs.mkdirSync(childDir);
      fs.writeFileSync(path.join(tmpDir, 'PROJECT-DIRECTIVE.md'), '# Directive');
      expect(findProjectDirective(childDir)).not.toBeNull();
    });

    it('should return null when not found', () => {
      // tmpDir has no PROJECT-DIRECTIVE.md and walk-up will hit root
      expect(findProjectDirective(tmpDir)).toBeNull();
    });
  });

  // =========================================================================
  // Test Run Registry Check
  // =========================================================================
  describe('checkTestRunRegistry', () => {
    let tmpDir: string;
    let registryPath: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-gate-registry-'));
      registryPath = path.join(tmpDir, 'test-run-registry.json');
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should return 0 when entity not in registry', () => {
      const registry = { entities: {} };
      fs.writeFileSync(registryPath, JSON.stringify(registry));
      expect(checkTestRunRegistry(registryPath, 'customer_sync')).toBe(0);
    });

    it('should count unique hashes', () => {
      const registry = {
        entities: {
          customer_sync: {
            novelInputHashes: ['aaa', 'bbb', 'ccc'],
          },
        },
      };
      fs.writeFileSync(registryPath, JSON.stringify(registry));
      expect(checkTestRunRegistry(registryPath, 'customer_sync')).toBe(3);
    });

    it('should return 0 when registry file missing', () => {
      expect(checkTestRunRegistry('/nonexistent/registry.json', 'customer_sync')).toBe(0);
    });

    it('should match entity with kebab-case variant', () => {
      const registry = {
        entities: {
          'customer-sync': {
            novelInputHashes: ['aaa', 'bbb', 'ccc'],
          },
        },
      };
      fs.writeFileSync(registryPath, JSON.stringify(registry));
      expect(checkTestRunRegistry(registryPath, 'customer_sync')).toBe(3);
    });
  });

  // =========================================================================
  // Full Hook Integration
  // =========================================================================
  describe('hook integration', () => {
    it('should allow non-cloud tools', async () => {
      const input = createInput('Write', { file_path: '/tmp/test.ts' });
      const result = await cloudObjectCreationGateHook(input);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('should block n8n create when no PROJECT-DIRECTIVE.md', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-gate-hook-'));

      try {
        const input = createInput('mcp__n8n-mcp__n8n_create_workflow', {
          name: 'test_workflow',
        });
        const result = await cloudObjectCreationGateHook(input, { cwd: tmpDir });
        expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
        expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
          'PROJECT-DIRECTIVE.md'
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should allow when CLOUD_GATE_BYPASS=1', async () => {
      const origBypass = process.env['CLOUD_GATE_BYPASS'];
      process.env['CLOUD_GATE_BYPASS'] = '1';

      try {
        const input = createInput('mcp__n8n-mcp__n8n_create_workflow', {
          name: 'test_workflow',
        });
        const result = await cloudObjectCreationGateHook(input);
        expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
        expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('CLOUD_GATE_BYPASS');
      } finally {
        if (origBypass === undefined) {
          delete process.env['CLOUD_GATE_BYPASS'];
        } else {
          process.env['CLOUD_GATE_BYPASS'] = origBypass;
        }
      }
    });
  });
});
