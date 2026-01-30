/**
 * Child Project Validator Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateChildProject } from '../../src/session/child_project_validator.js';
import { scanForOverrides } from '../../src/enforcement/child_project_detector.js';

// Mock modules
vi.mock('node:process', () => ({
  default: { cwd: () => '/mock/project' },
}));
vi.mock('../../src/utils.js', async () => {
  return {
    log: vi.fn(),
  };
});
vi.mock('../../src/enforcement/child_project_detector.js', () => ({
  scanForOverrides: vi.fn(),
  reportViolations: vi.fn(() => 'Mock report'),
}));

describe('Child Project Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateChildProject', () => {
    it('should pass when no violations found', () => {
      vi.mocked(scanForOverrides).mockReturnValue([]);

      const result = validateChildProject('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('strict');
    });

    it('should fail on error violations', () => {
      vi.mocked(scanForOverrides).mockReturnValue([
        {
          type: 'file',
          path: '/mock/project/.mcp.json',
          description: 'Prohibited override file',
          severity: 'error',
        },
      ]);

      const result = validateChildProject('/mock/project');

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('strict');
    });

    it('should pass with warnings only', () => {
      vi.mocked(scanForOverrides).mockReturnValue([
        {
          type: 'file',
          path: '/mock/project/.mcp.json',
          description: 'Local MCP configuration',
          severity: 'warning',
        },
      ]);

      const result = validateChildProject('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warn');
    });
  });
});
