// Code Node Test Template
// Location: tests/code-nodes/{workflow-name}/{node-name}/

import { describe, it, expect } from 'vitest';
import { nodeFunction } from './node-implementation.js';
import mockInput from './fixtures/mock-input.json';
import expectedOutput from './fixtures/expected-output.json';

describe('node-name', () => {
  it('transforms valid input correctly', () => {
    const result = nodeFunction(mockInput);
    expect(result).toEqual(expectedOutput);
  });

  it('handles empty input', () => {
    expect(() => nodeFunction({})).not.toThrow();
  });

  it('handles malformed input', () => {
    expect(() => nodeFunction({ bad: 'data' })).toThrow();
  });

  // Add ALL edge cases from spec
  it('handles edge case 1', () => {
    const result = nodeFunction({ edgeCase: true });
    expect(result).toBeDefined();
  });

  it('handles edge case 2', () => {
    const result = nodeFunction({ boundary: 'value' });
    expect(result).toMatchObject({ expected: 'shape' });
  });
});

// Fixture files structure:
// tests/code-nodes/my-workflow/transform-data/
//   ├── transform.js (implementation)
//   ├── transform.test.ts (this file)
//   └── fixtures/
//       ├── mock-input.json
//       ├── expected-output.json
//       ├── edge-case-1-input.json
//       └── edge-case-1-output.json
