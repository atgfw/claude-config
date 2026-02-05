# Test 01: Dirty Tree Detection

## Goal

Verify that session start warns when local repository has uncommitted changes and remote has new commits.

## Feature Under Test

- **File:** `hooks/src/session/git_synchronizer.ts`
- **Function:** `synchronizeGit()`
- **Severity:** WARN (non-blocking)

## Prerequisites

- Git repository with configured remote
- Network access to fetch from remote
- At least one commit on remote that is not local

## Setup Command

```bash
bun run scripts/test-setup/session-reinit/setup-dirty-tree.ts
```

The setup script will:
1. Create a local file modification (uncommitted)
2. Fetch remote to detect any new commits
3. Report the test conditions

## Test Steps

1. Run the setup script to create dirty tree condition
2. Start a new Claude Code session in the test project
3. Observe the session start output

## Expected Output

When local has uncommitted changes AND remote has new commits:

```
[WARN] Git Synchronization
Remote has N new commit(s). Local has uncommitted changes.

Remote changes:
  - <commit message> (<hash>)

Local uncommitted:
  - M <file path> (N lines changed)

Actions:
  1. Stash local, pull, then unstash
  2. Continue with local (remote not integrated)
  3. Abort and resolve manually
```

When local has uncommitted changes BUT remote is up to date:

```
[INFO] Git repository has uncommitted changes but is up to date with remote.
```

## Verification Checklist

- [ ] Warning appears during session start
- [ ] Remote commit count is accurate
- [ ] Local modified files are listed
- [ ] Warning does NOT block session (severity is WARN)

## Cleanup Command

```bash
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

Or manually:
```bash
git checkout -- .
git clean -fd
```

## Edge Cases to Test

1. **Network timeout**: Disconnect network, verify graceful timeout handling
2. **No remote configured**: Test in repo without origin
3. **Multiple modified files**: Verify all are listed
4. **Binary files**: Verify handling of non-text modifications
