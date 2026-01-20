# Spec: Branch Naming

**Capability:** branch-naming
**Enforcement:** WARN (soft)

## Allowed Patterns

```
feature/<description>
bugfix/<description>
hotfix/<description>
release/<description>
chore/<description>
docs/<description>
```

## Rules

1. **Prefix required** - Branch must start with allowed prefix
2. **Lowercase only** - No uppercase letters
3. **Kebab-case** - Use hyphens, not underscores or spaces
4. **Descriptive** - Description should indicate purpose
5. **No special characters** - Only alphanumeric and hyphens

## Protected Branches

These branches cannot be created directly:
- `main`
- `master`
- `develop`

## Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/user-authentication` |
| `bugfix/` | Bug fixes | `bugfix/login-redirect` |
| `hotfix/` | Production fixes | `hotfix/critical-security-patch` |
| `release/` | Release preparation | `release/1.2.0` |
| `chore/` | Maintenance | `chore/update-dependencies` |
| `docs/` | Documentation | `docs/api-reference` |

## Examples

### Good
```
feature/add-oauth2-support
bugfix/fix-null-pointer
hotfix/patch-sql-injection
release/2.0.0
chore/update-node-version
docs/installation-guide
```

### Bad (will warn)
```
my-feature
Feature/AddOAuth
feature_oauth
feature/Add OAuth Support
main
```

## Hook Implementation

File: `~/.claude/hooks/src/git/branch_naming_validator.ts`
Event: PreToolUse (Bash)
Matcher: `git checkout -b` or `git branch`
Action: Parse branch name, warn if non-conformant

## Validation Regex

```regex
^(feature|bugfix|hotfix|release|chore|docs)/[a-z0-9][a-z0-9-]*[a-z0-9]$
```
