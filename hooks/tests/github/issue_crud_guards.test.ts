/**
 * Tests for issue_crud.ts guard logic (title length and test pattern rejection).
 * Separate from issue_crud.test.ts which uses vi.importActual (incompatible with bun).
 */

import { describe, it, expect } from 'vitest';
import { computeKeywordOverlap } from '../../src/github/issue_crud.js';

describe('computeKeywordOverlap', () => {
  it('returns 1 for identical strings', () => {
    expect(computeKeywordOverlap('fix login bug', 'fix login bug')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(computeKeywordOverlap('deploy kubernetes', 'fix authentication')).toBe(0);
  });

  it('returns partial overlap for similar strings', () => {
    const overlap = computeKeywordOverlap(
      'fix authentication login flow',
      'fix authentication session timeout',
    );
    expect(overlap).toBeGreaterThan(0);
    expect(overlap).toBeLessThan(1);
  });

  it('filters stopwords from comparison', () => {
    // "the" and "a" are stopwords - should be filtered
    const overlap = computeKeywordOverlap('the login page', 'a login page');
    expect(overlap).toBe(1); // Both have just "login" and "page" after filtering
  });

  it('returns 1 for both empty strings', () => {
    expect(computeKeywordOverlap('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(computeKeywordOverlap('hello', '')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(computeKeywordOverlap('Fix Login Bug', 'fix login bug')).toBe(1);
  });
});
