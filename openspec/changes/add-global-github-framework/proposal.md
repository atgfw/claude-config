# Proposal: Global GitHub Framework for Vibe Coding Projects

**Change ID:** `add-global-github-framework`
**Status:** Active
**Created:** 2026-01-20

## Summary

Establish a comprehensive, automated GitHub framework that enforces commit conventions, automates releases with semantic versioning, generates changelogs, and provides strict security scanning - all integrated with the Spinal Cord hook system for global enforcement across all child projects.

## Motivation

Current state:
- No standardized commit message format
- Manual version bumping and release creation
- No automated changelog generation
- Secrets occasionally committed to repositories
- Inconsistent repository setup across projects

Desired state:
- Conventional Commits enforced (warn, not block)
- Fully automatic semantic versioning on push to main
- Auto-generated changelogs from commit history
- Strict blocking of API keys and secrets in commits
- Repository templates inherited from Spinal Cord

## User Decisions

| Decision | Choice |
|----------|--------|
| Commit violations | Warn then allow (soft enforcement) |
| Release automation | Fully automatic (hands-free) |
| Scope | Global enforcement (all child projects) |
| Secret detection | Strict (hard block) |

## Architecture

```
~/.claude/
    +-- github/                          # Framework config
    |   +-- templates/                   # Repo templates
    |   |   +-- README.template.md
    |   |   +-- CONTRIBUTING.template.md
    |   |   +-- PR_TEMPLATE.md
    |   +-- configs/                     # Tool configs
    |       +-- commitlint.config.js
    |       +-- release.config.js
    |
    +-- hooks/src/git/                   # Git hooks
    |   +-- commit_message_validator.ts
    |   +-- branch_naming_validator.ts
    |   +-- secret_scanner.ts
    |   +-- changelog_generator.ts
    |   +-- semantic_version_calculator.ts
    |
    +-- ledger/                          # Extended
    |   +-- release-registry.json        # NEW
    |   +-- changelog-registry.json      # NEW
    |
    +-- .github/workflows/               # Extended
        +-- semantic-release.yml         # NEW
        +-- security-scan.yml            # NEW
```

## Capabilities (6 Spec Deltas)

1. **commit-conventions** - Conventional Commits 1.0.0 enforcement (WARN)
2. **branch-naming** - Standard branch patterns (WARN)
3. **semantic-versioning** - Automatic SemVer 2.0.0 releases
4. **changelog-generation** - Keep a Changelog 1.1.0 format
5. **repository-templates** - Global templates for all repos
6. **security-scanning** - Secret detection (BLOCK)

## New Hooks (5)

| Hook | Event | Action |
|------|-------|--------|
| `commit_message_validator` | PreToolUse (Bash git commit) | Warn on non-conventional |
| `branch_naming_validator` | PreToolUse (Bash git checkout -b) | Warn on non-conformant |
| `secret_scanner` | PreToolUse (Bash git commit/push) | **BLOCK on secrets** |
| `changelog_generator` | PostToolUse (Bash git commit) | Update changelog-registry |
| `semantic_version_calculator` | PostToolUse (Bash git tag) | Update release-registry |

## Success Criteria

1. Commit with "test: verify commit hook" -> Warning displayed, commit allowed
2. Stage file containing AWS key -> **BLOCKED** with clear error
3. Push conventional commits to main -> Auto-version bump, changelog, release
4. All hooks pass: `cd ~/.claude/hooks && bun test`
