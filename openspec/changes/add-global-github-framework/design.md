# Design: Global GitHub Framework

**Change ID:** `add-global-github-framework`

## Hook Implementation Details

### 1. commit_message_validator.ts

**Trigger:** PreToolUse on Bash when command matches `git commit`

**Detection Pattern:**
```regex
git\s+commit\s+(-[a-zA-Z]+\s+)*(-m\s+["']([^"']+)["']|--message[=\s]+["']([^"']+)["'])
```

**Conventional Commits Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Allowed Types:**
- `feat` - New feature (MINOR bump)
- `fix` - Bug fix (PATCH bump)
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change, no feature/fix
- `perf` - Performance improvement (PATCH bump)
- `test` - Adding/updating tests
- `build` - Build system/dependencies
- `ci` - CI configuration
- `chore` - Maintenance tasks

**Breaking Change Indicators:**
- `BREAKING CHANGE:` in footer
- `!` after type/scope (e.g., `feat!:` or `feat(api)!:`)

**Enforcement:** WARN - Display message but allow commit

### 2. branch_naming_validator.ts

**Trigger:** PreToolUse on Bash when command matches `git checkout -b` or `git branch`

**Allowed Patterns:**
```regex
^(feature|bugfix|hotfix|release|chore|docs)/[a-z0-9-]+$
```

**Protected Branches:** `main`, `master`, `develop` (cannot create directly)

**Enforcement:** WARN - Display message but allow branch creation

### 3. secret_scanner.ts

**Trigger:** PreToolUse on Bash when command matches `git commit` or `git push`

**Detection Patterns:**
| Secret Type | Pattern | Example |
|-------------|---------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | `AKIAIOSFODNN7EXAMPLE` |
| AWS Secret Key | `[a-zA-Z0-9/+=]{40}` (near AWS context) | - |
| GitHub Token | `gh[pousr]_[a-zA-Z0-9]{36,}` | `ghp_xxxx...` |
| Generic API Key | `[a-zA-Z0-9_-]*api[_-]?key[a-zA-Z0-9_-]*["':=]\s*["']?[a-zA-Z0-9]{20,}` | - |
| Private Key | `-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----` | - |
| Password in URL | `://[^:]+:[^@]+@` | `mysql://user:pass@host` |
| Connection String | `(mongodb|postgres|mysql|redis)://[^:]+:[^@]+@` | - |
| JWT | `eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` | - |
| Slack Token | `xox[baprs]-[0-9a-zA-Z-]+` | - |
| Anthropic Key | `sk-ant-[a-zA-Z0-9-]+` | - |

**Pre-scan Approach:**
1. Check staged files with `git diff --cached --name-only`
2. Get content with `git show :0:<file>` for each staged file
3. Scan content for patterns
4. If detected, BLOCK with clear message listing file and line

**Enforcement:** BLOCK - Prevent commit/push

### 4. changelog_generator.ts

**Trigger:** PostToolUse on Bash when command matches `git commit`

**Process:**
1. Parse commit message
2. If conventional, extract type/scope/description/breaking
3. Add to `changelog-registry.json` under `unreleased`

**Categories Mapping:**
| Commit Type | Changelog Section |
|-------------|-------------------|
| feat | Added |
| fix | Fixed |
| perf | Changed |
| refactor | Changed |
| docs | Documentation |
| BREAKING CHANGE | Breaking |
| security (in scope) | Security |
| deprecate (in scope) | Deprecated |
| remove (in scope) | Removed |

### 5. semantic_version_calculator.ts

**Trigger:** PostToolUse on Bash when command matches `git tag`

**SemVer Rules:**
- MAJOR: `BREAKING CHANGE:` or `!` in any commit since last release
- MINOR: `feat` commit without breaking change
- PATCH: `fix` or `perf` commit

**Process:**
1. Get current version from `release-registry.json`
2. Analyze commits since last tag
3. Determine bump type
4. Update registry

## Ledger Schemas

### release-registry.json
```json
{
  "repositories": {
    "<repo-path>": {
      "currentVersion": "1.0.0",
      "releases": [
        {
          "version": "1.0.0",
          "tag": "v1.0.0",
          "commit": "abc123",
          "date": "2026-01-20T12:00:00Z",
          "changelog": "- Initial release"
        }
      ]
    }
  },
  "lastUpdated": "2026-01-20T12:00:00Z"
}
```

### changelog-registry.json
```json
{
  "repositories": {
    "<repo-path>": {
      "lastRelease": "1.0.0",
      "unreleased": [
        {
          "hash": "abc123",
          "type": "feat",
          "scope": "api",
          "description": "Add user endpoint",
          "breaking": false,
          "timestamp": "2026-01-20T12:00:00Z"
        }
      ]
    }
  },
  "lastUpdated": "2026-01-20T12:00:00Z"
}
```

## GitHub Actions

### semantic-release.yml

**Trigger:** Push to main/master

**Steps:**
1. Checkout with full history
2. Get latest tag
3. Analyze commits since tag
4. Calculate new version
5. Generate changelog from commits
6. Create git tag
7. Create GitHub release with changelog

### security-scan.yml

**Trigger:** Pull request + weekly schedule

**Steps:**
1. Checkout code
2. Run gitleaks or truffleHog
3. Run npm audit / pip audit
4. Report findings
5. Block PR if critical secrets found
