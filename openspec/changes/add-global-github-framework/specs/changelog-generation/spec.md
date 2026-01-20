# Spec: Changelog Generation

**Capability:** changelog-generation
**Standard:** Keep a Changelog 1.1.0
**Automation:** Automatic from commits

## Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

### Fixed
- Bug fix description

## [1.0.0] - 2026-01-20

### Added
- Initial release
```

## Sections

| Section | Commit Types | Description |
|---------|--------------|-------------|
| Added | `feat` | New features |
| Fixed | `fix` | Bug fixes |
| Changed | `refactor`, `perf` | Changes in existing functionality |
| Deprecated | `deprecate` (scope) | Features to be removed |
| Removed | `remove` (scope) | Removed features |
| Security | `security` (scope) | Security fixes |

## Mapping from Commits

```
feat(api): add user endpoint
-> ### Added
-> - **api**: Add user endpoint

fix: resolve null pointer
-> ### Fixed
-> - Resolve null pointer

perf(db): optimize queries
-> ### Changed
-> - **db**: Optimize queries

fix(security): patch XSS vulnerability
-> ### Security
-> - Patch XSS vulnerability
```

## Ledger: changelog-registry.json

Tracks unreleased changes per repository:

```json
{
  "repositories": {
    "/path/to/repo": {
      "lastRelease": "1.0.0",
      "unreleased": [
        {
          "hash": "abc1234",
          "type": "feat",
          "scope": "api",
          "description": "add user endpoint",
          "breaking": false,
          "timestamp": "2026-01-20T12:00:00Z"
        }
      ]
    }
  }
}
```

## Hook Implementation

File: `~/.claude/hooks/src/git/changelog_generator.ts`
Event: PostToolUse (Bash)
Matcher: `git commit`
Action: Parse commit, update changelog-registry.json

## Release Process

On release:
1. Read unreleased from registry
2. Group by section
3. Format as markdown
4. Insert into CHANGELOG.md
5. Clear unreleased in registry
6. Include in GitHub release body

## Breaking Changes

Breaking changes get special formatting:

```markdown
## [2.0.0] - 2026-01-20

### Breaking Changes
- **api**: Response format changed from array to object

### Added
- New configuration options
```
