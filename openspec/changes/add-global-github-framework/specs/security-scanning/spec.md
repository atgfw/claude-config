# Spec: Security Scanning

**Capability:** security-scanning
**Enforcement:** STRICT (hard block)

## Secret Patterns

| Secret Type | Pattern | Severity |
|-------------|---------|----------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | CRITICAL |
| AWS Secret Key | 40 char base64 near AWS context | CRITICAL |
| GitHub Token | `gh[pousr]_[a-zA-Z0-9]{36,}` | CRITICAL |
| Anthropic Key | `sk-ant-[a-zA-Z0-9-]+` | CRITICAL |
| OpenAI Key | `sk-[a-zA-Z0-9]{48}` | CRITICAL |
| Slack Token | `xox[baprs]-[0-9a-zA-Z-]+` | CRITICAL |
| Private Key | `-----BEGIN.*PRIVATE KEY-----` | CRITICAL |
| JWT | `eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` | HIGH |
| Connection String | `(mongodb|postgres|mysql|redis)://[^:]+:[^@]+@` | CRITICAL |
| Password in URL | `://[^:]+:[^@]+@` | HIGH |
| Generic API Key | `api[_-]?key.*=.*[a-zA-Z0-9]{20,}` | MEDIUM |
| Bearer Token | `Bearer\s+[a-zA-Z0-9._-]+` | HIGH |

## Hook Implementation

File: `~/.claude/hooks/src/git/secret_scanner.ts`
Event: PreToolUse (Bash)
Matcher: `git commit` or `git push`

## Scan Process

1. **Pre-commit scan:**
   - Get staged files: `git diff --cached --name-only`
   - Read each file content
   - Scan for secret patterns
   - Block if any found

2. **Pre-push scan:**
   - Get commits to push: `git log origin/main..HEAD`
   - Scan each commit's diff
   - Block if any found

## Blocked Output Format

```
BLOCKED: Secret detected in staged files

File: src/config.js
Line 15: AWS Access Key detected
  > const key = "AKIAIOSFODNN7EXAMPLE"

RESOLUTION:
1. Remove the secret from the file
2. Use environment variables instead
3. Add the file to .gitignore if appropriate
4. Run: git reset HEAD <file>

NEVER commit secrets to version control.
```

## Allowlist

Some patterns may be false positives. Allow via `.secretscanignore`:

```
# Ignore test fixtures
tests/fixtures/mock-keys.json

# Ignore specific line
src/config.js:15  # Example key for docs
```

## GitHub Action Backup

File: `~/.claude/.github/workflows/security-scan.yml`

Runs on:
- Every pull request
- Weekly scheduled scan

Tools:
- gitleaks (secret scanning)
- npm audit / pip audit (dependency scanning)
- CodeQL (if available)

## CI Integration

```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Run gitleaks
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    - name: Dependency audit
      run: npm audit --audit-level=high
```

## Severity Levels

| Level | Action | Example |
|-------|--------|---------|
| CRITICAL | Hard block, require removal | AWS keys, private keys |
| HIGH | Hard block, require review | JWTs, passwords |
| MEDIUM | Warn, allow with flag | Generic patterns |
