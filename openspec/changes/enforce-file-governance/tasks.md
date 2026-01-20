# Tasks: Enforce File Governance

## Phase 1: Core Filename Validation

- [ ] Create `file_governance_config.ts` with rule definitions
- [ ] Add `isGenericFilename()` util - detect banned patterns
- [ ] Add `isValidSnakeCase()` util - enforce naming convention
- [ ] Add `isDescriptiveFilename()` util - minimum length/word check
- [ ] Extend `pre-write` hook with filename validation
- [ ] Add test cases for filename validation

## Phase 2: Content Standards

- [ ] Add `getCommentRatio()` util - calculate comment percentage
- [ ] Add `isStubFile()` util - detect empty/minimal files
- [ ] Add `hasUnusedImports()` util - basic static analysis
- [ ] Add `hasValidationWithoutZod()` util - detect missing Zod
- [ ] Extend `pre-write` hook with content validation
- [ ] Add test cases for content validation

## Phase 3: Technology Restrictions

- [ ] Add `isOversizedShellScript()` util - line count check
- [ ] Add `shouldBeTypeScript()` util - suggest TS over JS
- [ ] Add `isPythonWithoutMLContext()` util - detect misuse
- [ ] Extend `pre-write` and `pre-bash` hooks
- [ ] Add test cases for tech restrictions

## Phase 4: Supersession Protocol

- [ ] Add `fileExistsAndNotArchived()` util
- [ ] Add `generateArchivePath()` util - dated naming
- [ ] Extend `pre-write` hook with archive enforcement
- [ ] Add test cases for supersession

## Phase 5: Runtime Output Standards

- [ ] Add `isSlugifiedFilename()` util
- [ ] Add `hasTimestampSuffix()` util
- [ ] Add `hasProjectNamespace()` util
- [ ] Extend `post-tool-use` hook for output validation
- [ ] Add test cases for runtime output

## Phase 6: Scaffolding Script (Optional)

- [ ] Create `scaffold_new_file.ts` CLI tool
- [ ] Add npm script `new:file` to package.json
- [ ] Include Zod boilerplate generation
- [ ] Add test cases for scaffolding
