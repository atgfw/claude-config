# Spec: Semantic Versioning

**Capability:** semantic-versioning
**Standard:** SemVer 2.0.0
**Automation:** Fully automatic

## Version Format

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

Examples:
- `1.0.0`
- `2.1.3`
- `1.0.0-alpha.1`
- `1.0.0-beta.2+build.123`

## Bump Rules

| Commit Type | Bump | Example |
|-------------|------|---------|
| `BREAKING CHANGE:` | MAJOR | 1.0.0 -> 2.0.0 |
| `feat!:` | MAJOR | 1.0.0 -> 2.0.0 |
| `feat` | MINOR | 1.0.0 -> 1.1.0 |
| `fix` | PATCH | 1.0.0 -> 1.0.1 |
| `perf` | PATCH | 1.0.0 -> 1.0.1 |
| Others | None | 1.0.0 -> 1.0.0 |

## Priority

When multiple commits exist:
1. Any BREAKING CHANGE -> MAJOR
2. Any feat (no breaking) -> MINOR
3. Any fix/perf -> PATCH
4. All other -> No bump

## Initial Version

New repositories start at `0.1.0` until first stable release.

Pre-1.0.0 rules:
- BREAKING -> MINOR (0.1.0 -> 0.2.0)
- feat -> MINOR (0.1.0 -> 0.2.0)
- fix -> PATCH (0.1.0 -> 0.1.1)

## Release Process

1. Push to main/master triggers action
2. Analyze commits since last tag
3. Calculate version bump
4. Generate changelog
5. Create git tag `v{VERSION}`
6. Create GitHub release

## Ledger: release-registry.json

```json
{
  "repositories": {
    "/path/to/repo": {
      "currentVersion": "1.2.3",
      "releases": [{
        "version": "1.2.3",
        "tag": "v1.2.3",
        "commit": "abc1234",
        "date": "2026-01-20T12:00:00Z",
        "changelog": "### Added\n- Feature X"
      }]
    }
  }
}
```

## Hook Implementation

File: `~/.claude/hooks/src/git/semantic_version_calculator.ts`
Event: PostToolUse (Bash)
Matcher: `git tag`
Action: Update release-registry.json

## GitHub Action

File: `~/.claude/.github/workflows/semantic-release.yml`
Trigger: Push to main/master
Output: Git tag + GitHub release
