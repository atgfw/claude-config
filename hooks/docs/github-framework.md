# GitHub Framework Reference

Standardized version control across all projects. Enforced by hooks in `hooks/src/git/`.

## Commit Conventions

**Enforced by:** `commit_message_validator.ts` (WARN - soft)
**Standard:** Conventional Commits 1.0.0

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

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

**Breaking Changes:** Add `!` after type or include `BREAKING CHANGE:` in footer for MAJOR bump.

## Default Branch Standard

**Enforced by:** `branch_naming_validator.ts` (STRICT - hard block)

All repositories MUST use `main` as the default branch. The branch name `master` is BANNED.

| Allowed | Banned |
|---------|--------|
| `main` | `master` |
| `origin/main` | `origin/master` |

The hook blocks any git command referencing `master`:
- `git checkout master` -> BLOCKED
- `git push origin master` -> BLOCKED
- `git merge master` -> BLOCKED

## Branch Naming

**Enforced by:** `branch_naming_validator.ts` (WARN - soft)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/user-auth` |
| `bugfix/` | Bug fixes | `bugfix/login-redirect` |
| `hotfix/` | Urgent fixes | `hotfix/security-patch` |
| `release/` | Release preparation | `release/2.0.0` |
| `chore/` | Maintenance | `chore/update-deps` |
| `docs/` | Documentation | `docs/api-reference` |

## Secret Scanning

**Enforced by:** `secret_scanner.ts` (STRICT - hard block)

Detected patterns include:
- AWS keys (`AKIA...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- Anthropic keys (`sk-ant-...`)
- Private keys (`-----BEGIN...PRIVATE KEY-----`)
- Connection strings (database URLs with embedded credentials)
- JWTs, Slack tokens, Stripe keys, etc.

## Semantic Versioning

**Standard:** SemVer 2.0.0
**Automation:** Fully automatic on push to main

| Commit Type | Version Bump |
|-------------|--------------|
| `BREAKING CHANGE:` or `!` | MAJOR |
| `feat` | MINOR |
| `fix`, `perf` | PATCH |

## Release Automation

**Managed by:** `changelog_generator.ts`, `semantic_version_calculator.ts`

On push to main:
1. Analyze commits since last tag
2. Calculate version bump
3. Generate changelog
4. Create git tag
5. Create GitHub release

## Git Hook Summary

| Hook | Event | Severity | Action |
|------|-------|----------|--------|
| `secret_scanner` | PreToolUse (git commit/push) | BLOCK | Stops commits containing secrets |
| `commit_message_validator` | PreToolUse (git commit) | WARN | Warns on non-conventional format |
| `branch_naming_validator` | PreToolUse (git checkout -b) | WARN/BLOCK | Warns non-conformant, blocks `master` |
| `changelog_generator` | PostToolUse (git commit) | N/A | Updates changelog-registry |
| `semantic_version_calculator` | PostToolUse (git tag) | N/A | Updates release-registry |

## Templates

```
~/.claude/github/
    +-- templates/
    |   +-- README.template.md
    |   +-- CONTRIBUTING.template.md
    |   +-- PR_TEMPLATE.md
    +-- configs/
        +-- commitlint.config.js
        +-- release.config.js
```
