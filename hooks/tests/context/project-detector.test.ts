/**
 * Project Detector Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectProjectContext,
  isN8nProject,
  isElevenLabsProject,
} from '../../src/context/project-detector';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
  };
});

describe('Project Detector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectProjectContext', () => {
    it('should detect n8n project with governance file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const path = String(p);
        return (
          path.includes('workflows/governance.yaml') ||
          path.includes('workflows') ||
          path.includes('.claude')
        );
      });

      const context = detectProjectContext('/test/project');

      expect(context.projectType).toBe('n8n');
      expect(context.hasGovernanceFile).toBe(true);
      expect(context.hasWorkflowsDir).toBe(true);
    });

    it('should detect generic project without markers', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const context = detectProjectContext('/test/project');

      expect(context.projectType).toBe('generic');
      expect(context.hasGovernanceFile).toBe(false);
    });

    it('should detect n8n project with workflow-governance hook', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const path = String(p);
        return path.includes('.claude/hooks/workflow-governance.js') || path.includes('workflows');
      });

      const context = detectProjectContext('/test/project');

      expect(context.projectType).toBe('n8n');
    });
  });

  describe('isN8nProject', () => {
    it('should return true for n8n project', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const path = String(p);
        return path.includes('workflows/governance.yaml') || path.includes('workflows');
      });

      expect(isN8nProject()).toBe(true);
    });

    it('should return false for generic project', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(isN8nProject()).toBe(false);
    });
  });

  describe('isElevenLabsProject', () => {
    it('should return true for elevenlabs project', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const path = String(p);
        return (
          path.includes('context/elevenlabs-agents/governance.yaml') ||
          path.includes('.claude/directives/integrations/elevenlabs/manifest.yaml')
        );
      });

      expect(isElevenLabsProject()).toBe(true);
    });

    it('should return true for n8n project (elevenlabs is subset)', () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const path = String(p);
        return path.includes('workflows/governance.yaml');
      });

      expect(isElevenLabsProject()).toBe(true);
    });
  });
});
