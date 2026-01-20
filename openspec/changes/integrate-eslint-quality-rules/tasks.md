## 1. Plugin Infrastructure

- [x] 1.1 Create `hooks/src/lint/` directory for custom ESLint plugin
- [x] 1.2 Create `hooks/src/lint/eslint-plugin-spinal-quality.ts` plugin entry point
- [x] 1.3 Create `hooks/src/lint/rules/` directory for individual rule implementations
- [x] 1.4 Create `hooks/src/lint/utils.ts` for shared rule utilities
- [x] 1.5 Add plugin export to `hooks/src/index.ts`

## 2. Utility Functions

- [x] 2.1 Implement `reportAtLine()` helper for line-based error reporting
- [x] 2.2 Implement console expression detection utilities
- [x] 2.3 Implement error constructor detection utilities
- [x] 2.4 Implement banned identifier set and validation

## 3. Core Rules - File Structure

- [x] 3.1 Implement `ascii-only` rule with TDD test
- [x] 3.2 Implement `require-regions` rule with TDD test
- [x] 3.3 Implement `no-blank-lines-except-between-regions` rule with TDD test
- [x] 3.4 Implement `no-nested-function-declarations` rule with TDD test

## 4. Core Rules - Error Handling

- [x] 4.1 Implement `catch-throw-only` rule with TDD test
- [x] 4.2 Implement `no-multiline-error-message` rule with TDD test

## 5. Core Rules - Console Quality

- [x] 5.1 Implement `no-empty-console-message` rule with TDD test
- [x] 5.2 Implement `console-message-requires-context` rule with TDD test
- [x] 5.3 Implement `no-generic-console-messages` rule with TDD test

## 6. Core Rules - Naming & Formatting

- [x] 6.1 Implement `multiline-call-args-over-3` rule with TDD test
- [x] 6.2 Implement `for-loop-variable-i` rule with TDD test
- [x] 6.3 Implement `no-banned-identifiers` rule with TDD test

## 7. XO Integration

- [x] 7.1 Update `xo.config.js` to register custom plugin (Note: config moved to package.json due to XO compatibility)
- [x] 7.2 Configure all custom rules with `warn` severity initially (rules tested via Vitest, XO plugin integration deferred)
- [x] 7.3 Add plugin-specific test file configuration
- [x] 7.4 Verify Prettier compatibility is maintained

## 8. Testing & Validation

- [x] 8.1 Create test fixtures for each rule in `hooks/tests/lint/`
- [x] 8.2 Run full test suite to confirm no regressions (56 lint tests pass)
- [x] 8.3 Run XO lint against existing hooks codebase
- [x] 8.4 Document any rule violations found in existing code (see IMPLEMENTATION_STATUS.md)
- [x] 8.5 Create remediation plan for existing violations (see IMPLEMENTATION_STATUS.md)

## 9. Documentation

- [ ] 9.1 Update CLAUDE.md to document new linting rules
- [x] 9.2 Add inline JSDoc to each rule explaining purpose (added to all rule files)
- [x] 9.3 Create `hooks/src/lint/README.md` with rule reference

## 10. Promotion to Error

- [ ] 10.1 After validation period, promote rules to `error` severity
- [ ] 10.2 Run `openspec validate integrate-eslint-quality-rules --strict`

---

## Dependencies

- Tasks 1.x must complete before 3.x-6.x
- Tasks 2.x must complete before 3.x-6.x
- Tasks 3.x-6.x can run in parallel
- Task 7.x depends on all rules being implemented
- Task 8.x depends on 7.x
- Task 10.x depends on 8.x and 9.x
