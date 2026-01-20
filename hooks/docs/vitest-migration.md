# Vitest Migration Guide

Vitest is the ONLY approved test framework. Migrate Jest to Vitest immediately.

## Package Changes

```bash
# Remove Jest
npm uninstall jest @types/jest ts-jest jest-environment-jsdom

# Install Vitest
npm install -D vitest @vitest/coverage-v8
```

## Config Migration

**DELETE:** `jest.config.js`

**CREATE:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,           // jest.fn() -> vi.fn() OR use globals
    environment: 'node',     // or 'jsdom' for browser
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## API Equivalents

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `@jest/globals` | `vitest` |

## Import Changes

```typescript
// Jest (remove these)
import { jest } from '@jest/globals';

// Vitest (add these)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

## package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## TypeScript Projects

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
  },
});
```

## React/DOM Testing

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## Migration Checklist

- [ ] Uninstall Jest packages
- [ ] Install Vitest packages
- [ ] Delete jest.config.js
- [ ] Create vitest.config.ts
- [ ] Update package.json scripts
- [ ] Replace `jest` imports with `vitest`
- [ ] Replace `jest.fn()` with `vi.fn()`
- [ ] Run tests to verify migration
