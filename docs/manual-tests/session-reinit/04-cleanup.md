# Test 04: Cleanup (Stale File Archival)

## Goal

Verify that session start moves stale temporary files to old/YYYY-MM-DD/ directory.

## Feature Under Test

- **File:** `hooks/src/session/project_cleanup.ts`
- **Function:** `cleanupProject()`
- **Severity:** INFO (non-blocking)

## Prerequisites

- Write permissions in project directory
- Ability to create files with old timestamps

## Setup Command

```bash
bun run scripts/test-setup/session-reinit/setup-temp-files.ts
```

The setup script will:
1. Create test.tmp in project root
2. Set file modification time to 48 hours ago (beyond 24h threshold)

## Test Steps

1. Run the setup script to create stale temp files
2. Start a new Claude Code session
3. Observe cleanup behavior
4. Verify files moved to old/ directory

## Expected Output

```
[+] Project Cleanup
Archived 1 stale file(s) to old/2026-02-05/:
  - test.tmp (48 hours old, moved from ./)
```

## Verification Checklist

- [ ] Stale files are moved (not deleted)
- [ ] Destination is old/YYYY-MM-DD/ format
- [ ] Original path is preserved in archive
- [ ] Cleanup is logged with file list
- [ ] Files within threshold are NOT moved
- [ ] Session continues (non-blocking)

## Cleanup Command

```bash
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

Or manually:
```bash
rm -rf old/
```

## Edge Cases to Test

1. **Multiple file types**: Create *.tmp, *.bak, *.log files
   - Expected: Each type uses its own threshold

2. **Nested files**: Create subdir/test.tmp
   - Expected: Archived with path preserved

3. **Already archived**: File already in old/ directory
   - Expected: Skipped (not double-archived)

4. **Permission denied**: Read-only file
   - Expected: Warning logged, continue with others

## Cleanup Rules Reference

| Pattern | Description | Max Age (hours) |
|---------|-------------|-----------------|
| `*.tmp` | Temporary files | 24 |
| `*.bak` | Backup files | 168 (7 days) |
| `*.log` | Log files | 72 (3 days) |
| `*~` | Editor backups | 24 |
| `*.swp` | Vim swap files | 24 |

## Deletion Ban

Per CLAUDE.md rules, files are NEVER deleted. They are always moved to old/ directory with date-based organization.
