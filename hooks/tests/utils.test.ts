/**
 * Tests for utils.ts
 */

import { describe, it, expect } from 'vitest';
import { isPathMatch } from '../src/utils.js';

describe('isPathMatch', () => {
  describe('exact matches', () => {
    it('returns true for identical paths', () => {
      expect(isPathMatch('/projects/myapp', '/projects/myapp')).toBe(true);
    });

    it('returns true for identical Windows paths', () => {
      expect(isPathMatch('C:\\Users\\test\\project', 'C:\\Users\\test\\project')).toBe(true);
    });

    it('handles mixed separators as equivalent', () => {
      expect(isPathMatch('C:\\Users\\test', 'C:/Users/test')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isPathMatch('/Projects/MyApp', '/projects/myapp')).toBe(true);
    });
  });

  describe('parent-child relationships', () => {
    it('returns true when first path is child of second', () => {
      expect(isPathMatch('/projects/myapp/src', '/projects/myapp')).toBe(true);
    });

    it('returns true when second path is child of first', () => {
      expect(isPathMatch('/projects/myapp', '/projects/myapp/src')).toBe(true);
    });

    it('handles deeply nested children', () => {
      expect(isPathMatch('/projects/myapp/src/components/Button', '/projects/myapp')).toBe(true);
    });

    it('handles Windows parent-child paths', () => {
      expect(isPathMatch('C:\\Users\\test\\project\\src', 'C:\\Users\\test\\project')).toBe(true);
    });
  });

  describe('sibling directories (CRITICAL - prevents goal leakage)', () => {
    it('rejects sibling directories with shared prefix', () => {
      // This is the critical bug fix - /projects/myapp should NOT match /projects/myapp2
      expect(isPathMatch('/projects/myapp', '/projects/myapp2')).toBe(false);
    });

    it('rejects reverse sibling comparison', () => {
      expect(isPathMatch('/projects/myapp2', '/projects/myapp')).toBe(false);
    });

    it('rejects siblings with longer shared prefix', () => {
      expect(isPathMatch('/projects/app', '/projects/app-legacy')).toBe(false);
      expect(isPathMatch('/projects/app-legacy', '/projects/app')).toBe(false);
    });

    it('rejects siblings with numeric suffix', () => {
      expect(isPathMatch('/home/user/project1', '/home/user/project10')).toBe(false);
    });

    it('rejects Windows sibling directories', () => {
      expect(isPathMatch('C:\\Projects\\myapp', 'C:\\Projects\\myapp-backup')).toBe(false);
    });
  });

  describe('unrelated paths', () => {
    it('rejects completely different paths', () => {
      expect(isPathMatch('/home/alice/project', '/home/bob/project')).toBe(false);
    });

    it('rejects paths with no common ancestry beyond root', () => {
      expect(isPathMatch('/var/log', '/etc/config')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles trailing slashes', () => {
      // path.resolve normalizes these
      expect(isPathMatch('/projects/myapp/', '/projects/myapp')).toBe(true);
    });

    it('handles root path on Unix systems', () => {
      // On Windows, '/' resolves to current drive root which may not be parent of /home/user
      // This test is Unix-specific; on Windows we skip this assertion
      if (process.platform !== 'win32') {
        expect(isPathMatch('/', '/home/user')).toBe(true);
      } else {
        // On Windows, just verify it doesn't throw
        expect(() => isPathMatch('/', '/home/user')).not.toThrow();
      }
    });

    it('handles empty-ish paths by resolving to cwd', () => {
      // path.resolve('.') returns current working directory
      // This test just ensures it doesn't throw
      expect(() => isPathMatch('.', '.')).not.toThrow();
    });
  });
});
