# Spec: Commit Conventions

**Capability:** commit-conventions
**Standard:** Conventional Commits 1.0.0
**Enforcement:** WARN (soft)

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | None |
| `style` | Formatting, no code change | None |
| `refactor` | Code change, no feature/fix | None |
| `perf` | Performance improvement | PATCH |
| `test` | Adding/updating tests | None |
| `build` | Build system/dependencies | None |
| `ci` | CI configuration | None |
| `chore` | Maintenance tasks | None |

## Breaking Changes

Breaking changes trigger MAJOR version bump:

```
feat!: remove deprecated API endpoint

feat(api)!: change response format

feat: add new feature

BREAKING CHANGE: The API response format has changed
```

## Scope

Optional, describes the affected component:

```
feat(auth): add OAuth2 support
fix(api): handle null response
docs(readme): update installation steps
```

## Examples

### Good
```
feat(user): add email verification endpoint
fix: resolve null pointer in auth middleware
docs: update API documentation
refactor(db): optimize query performance
```

### Bad (will warn)
```
Added new feature
fixed bug
Update readme
WIP
```

## Hook Implementation

File: `~/.claude/hooks/src/git/commit_message_validator.ts`
Event: PreToolUse (Bash)
Matcher: `git commit`
Action: Parse message, warn if non-conventional

## Validation Rules

1. Must start with valid type
2. Type must be lowercase
3. Description must not be empty
4. Description should not end with period
5. Description should be imperative mood
6. Line length should not exceed 72 characters
