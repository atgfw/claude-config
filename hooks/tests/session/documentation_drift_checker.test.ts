/**
 * Documentation Drift Checker Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkDocumentationDrift } from '../../src/session/documentation_drift_checker.js';
import {
  parseWorkflowRegistry,
  findLocalWorkflows,
  findStaleReferences,
} from '../../src/governance/documentation_drift_detector.js';

// Mock modules
vi.mock('node:process', () => ({
  default: { cwd: () => '/mock/project' },
}));
vi.mock('../../src/utils.js', async () => {
  return {
    log: vi.fn(),
  };
});
vi.mock('../../src/governance/documentation_drift_detector.js', () => ({
  parseWorkflowRegistry: vi.fn(),
  findLocalWorkflows: vi.fn(),
  findStaleReferences: vi.fn(),
  formatDriftReport: vi.fn(() => 'Mock report'),
}));

describe('Documentation Drift Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseWorkflowRegistry).mockReturnValue(new Map());
    vi.mocked(findLocalWorkflows).mockReturnValue(new Map());
    vi.mocked(findStaleReferences).mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkDocumentationDrift', () => {
    it('should pass when no drift detected', () => {
      const result = checkDocumentationDrift('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('consistent');
    });

    it('should warn when drift issues found', () => {
      vi.mocked(findStaleReferences).mockReturnValue([
        {
          type: 'stale_reference',
          severity: 'warning',
          file: '/mock/project/README.md',
          message: 'Stale workflow ID reference',
          recommendation: 'Update documentation',
        },
      ]);

      const result = checkDocumentationDrift('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warn');
    });
  });
});
