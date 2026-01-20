/**
 * XO Configuration Reference - NOT ACTIVE
 *
 * IMPORTANT: The actual XO configuration is in package.json under the "xo" key.
 * This file is kept as documentation/reference only and is NOT loaded by XO.
 *
 * XO is a zero-config linter with sensible defaults.
 * This configuration documents customizations for the Spinal Cord hook system.
 *
 * Note: Custom spinal-quality rules are implemented in src/lint/ and tested via Vitest.
 * They can be integrated with ESLint directly but XO's plugin system has compatibility
 * limitations. For direct ESLint usage, import the plugin from dist/lint/eslint-plugin-spinal-quality.js.
 *
 * @see https://github.com/xojs/xo
 * @see src/lint/README.md for spinal-quality rules documentation
 */

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    // Indentation: 2 spaces (matches Prettier default)
    space: 2,

    // Semicolons: required (clearer ASI boundaries)
    semicolon: true,

    // Prettier integration: use compat mode to avoid conflicts
    // 'compat' disables XO rules that conflict with Prettier
    prettier: 'compat',

    // TypeScript: automatically enabled for .ts/.tsx files
    // XO handles @typescript-eslint configuration automatically

    // Node.js specific settings
    rules: {
      // Allow console in CLI tools and hooks (we use stderr for diagnostics)
      'no-console': 'off',

      // Allow process.exit in CLI contexts
      'unicorn/no-process-exit': 'off',

      // Allow abbreviations that are common in our codebase
      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            // Allow common abbreviations
            args: false,
            env: false,
            err: false,
            fn: false,
            func: false,
            msg: false,
            params: false,
            pkg: false,
            props: false,
            ref: false,
            req: false,
            res: false,
            src: false,
            str: false,
            tmp: false,
            val: false,
          },
          allowList: {
            // Allow specific identifiers
            ProcessEnv: true,
          },
        },
      ],

      // Prefer named exports for better tree-shaking
      'import/prefer-default-export': 'off',

      // Allow unused variables with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Relax some strict TypeScript rules for practicality
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Allow empty catch blocks with comment
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Filename case: allow kebab-case and snake_case
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            snakeCase: true,
            pascalCase: true,
          },
        },
      ],

      // Allow null (we use it intentionally in some places)
      'unicorn/no-null': 'off',

      // Allow array reduce (useful for transformations)
      'unicorn/no-array-reduce': 'off',

      // Allow nested ternaries (with proper formatting)
      'unicorn/no-nested-ternary': 'off',

      // Prefer node: protocol for built-in modules
      'unicorn/prefer-node-protocol': 'error',

      // Prefer modern JavaScript features
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-top-level-await': 'off', // Not always practical

      // Error handling
      'unicorn/prefer-type-error': 'error',

      // Performance
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-array-flat-map': 'error',

      // Custom spinal-quality rules are available in src/lint/eslint-plugin-spinal-quality.ts
      // They are tested via Vitest and can be integrated with direct ESLint usage.
      // XO plugin registration has compatibility limitations, so these rules are documented
      // but not enforced through XO.
      //
      // Available rules (use with ESLint directly):
      // - spinal-quality/ascii-only: Disallow non-ASCII characters
      // - spinal-quality/require-regions: Require VSCode #region blocks
      // - spinal-quality/no-blank-lines-except-between-regions: Blank line placement
      // - spinal-quality/no-nested-function-declarations: Top-level functions only
      // - spinal-quality/catch-throw-only: Catch blocks must only rethrow
      // - spinal-quality/no-multiline-error-message: Single-line error messages
      // - spinal-quality/no-empty-console-message: No empty console output
      // - spinal-quality/console-message-requires-context: Console needs context
      // - spinal-quality/no-generic-console-messages: No boilerplate messages
      // - spinal-quality/multiline-call-args-over-3: Multiline formatting for 4+ args
      // - spinal-quality/for-loop-variable-i: Loop variable must be 'i'
      // - spinal-quality/no-banned-identifiers: No generic variable names
    },
  },

  // Test files configuration
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      // Relax rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'unicorn/no-null': 'off',
    },
  },

  // Hook files configuration
  {
    files: ['**/hooks/**/*.ts'],
    rules: {
      // Hooks need to output to stderr
      'no-console': 'off',
    },
  },
];

export default xoConfig;
